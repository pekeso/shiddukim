import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  StorageService,
  type UploadInput,
} from '../storage/storage.service.js';
import { AuditService } from '../audit/audit.service.js';
import { AuditAction } from '../common/constants/audit-actions.js';
import {
  DocumentType,
  DocumentStatus,
  DocumentVisibility,
  FileAccessAction,
} from '../../generated/prisma/client.js';
import type { UploadDocumentDto } from './dto/upload-document.dto.js';
import type { RequestContext } from '../auth/auth.service.js';

// ─── Public response shape (never exposes r2ObjectKey or database id) ─────────

export interface DocumentResponse {
  documentCode: string;
  ownerType: string;
  ownerId: string;
  documentType: DocumentType;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  visibility: DocumentVisibility;
  status: DocumentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentWithUrlResponse extends DocumentResponse {
  /** Short-lived signed URL — expires in R2_SIGNED_URL_EXPIRES_IN seconds. */
  signedUrl: string;
  /** When the signed URL expires (ISO 8601). */
  signedUrlExpiresAt: string;
}

// ─── Folder mapping per document type ────────────────────────────────────────

const DOCUMENT_TYPE_FOLDER: Record<DocumentType, string> = {
  [DocumentType.MEMBER_PHOTO]: 'members/photos',
  [DocumentType.MEMBER_CARD]: 'members/cards',
  [DocumentType.MARRIAGE_REQUEST_PDF]: 'marriage/requests',
  [DocumentType.MEDICAL_REFERRAL_PDF]: 'marriage/referrals',
  [DocumentType.SUPPORTING_DOCUMENT]: 'documents/uploads',
};

// ─────────────────────────────────────────────────────────────────────────────

/**
 * DocumentsService — manages document metadata in PostgreSQL and coordinates
 * with StorageService for all R2 interactions.
 *
 * Responsibility split:
 *   StorageService  — file upload, signed URL generation, R2 interactions
 *   DocumentsService — document codes, metadata persistence, ownership checks,
 *                      FileAccessLog writes, audit events
 *
 * Security rules enforced here:
 *   - documentCode is the only public identifier (never expose DB id or r2ObjectKey)
 *   - Every file access (view, download, upload, delete) is logged to FileAccessLog
 *   - Ownership check: members can only access their own documents
 *   - Admins / pastors: access controlled by caller (controller RBAC decorators)
 */
@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly audit: AuditService,
  ) {}

  // ── Upload ─────────────────────────────────────────────────────────────────

  /**
   * Uploads a file to R2 and persists the Document metadata record.
   *
   * Flow:
   *   1. Upload via StorageService (validates MIME, size, computes checksum).
   *   2. Generate a unique documentCode.
   *   3. Create Document record in PostgreSQL.
   *   4. Write FileAccessLog entry (UPLOAD action).
   *   5. Audit FILE.UPLOADED.
   *   6. Return DocumentResponse (no r2ObjectKey).
   */
  async upload(
    file: Express.Multer.File,
    dto: UploadDocumentDto,
    actorUserId: string,
    ctx?: RequestContext,
  ): Promise<DocumentResponse> {
    const folder = DOCUMENT_TYPE_FOLDER[dto.documentType];

    // 1. Upload to R2 (validation + checksum happen inside StorageService)
    const uploadResult = await this.storage.upload({
      buffer: file.buffer,
      folder,
      mimeType: file.mimetype,
      originalFileName: file.originalname,
      uploadedByUserId: actorUserId,
    } satisfies UploadInput);

    // 2. Generate unique document code (DOC-YYYY-NNNNN)
    const documentCode = await this.generateDocumentCode();

    // 3. Determine stored file name (UUID portion extracted from key)
    const keyParts = uploadResult.r2ObjectKey.split('/');
    const storedFileName = keyParts[keyParts.length - 1] ?? randomUUID();

    // 4. Persist document metadata
    const document = await this.prisma.document.create({
      data: {
        documentCode,
        ownerType: dto.ownerType,
        ownerId: dto.ownerId,
        documentType: dto.documentType,
        visibility: DocumentVisibility.PRIVATE,
        status: DocumentStatus.ACTIVE,
        originalFileName: file.originalname,
        storedFileName,
        r2Bucket: uploadResult.bucket,
        r2ObjectKey: uploadResult.r2ObjectKey, // stored internally; NEVER returned to clients
        mimeType: uploadResult.mimeType,
        fileSize: uploadResult.fileSize,
        checksum: uploadResult.checksum,
        uploadedByUserId: actorUserId,
        generatedByUserId: null,
      },
    });

    // 5. Log file access (UPLOAD action)
    await this.logAccess({
      documentId: document.id,
      actorUserId,
      action: FileAccessAction.UPLOAD,
      ctx,
      metadata: {
        documentCode,
        documentType: dto.documentType,
        ownerType: dto.ownerType,
        fileSize: uploadResult.fileSize,
        mimeType: uploadResult.mimeType,
        notes: dto.notes,
      },
    });

    // 6. Audit event
    this.audit.log({
      actorUserId,
      action: AuditAction.FILE.UPLOADED,
      entityType: 'Document',
      entityId: documentCode,
      metadata: {
        documentType: dto.documentType,
        ownerType: dto.ownerType,
        fileSize: uploadResult.fileSize,
        mimeType: uploadResult.mimeType,
      },
      ipAddress: ctx?.ipAddress,
      userAgent: ctx?.userAgent,
    });

    this.logger.log(
      `[DocumentsService] Document uploadé: ${documentCode} (${dto.documentType})`,
    );

    return this.toResponse(document);
  }

  // ── Get metadata ───────────────────────────────────────────────────────────

  /**
   * Returns document metadata by documentCode.
   * Does NOT generate a signed URL — use getSignedUrl() for that.
   *
   * @throws NotFoundException if document not found or soft-deleted.
   */
  async findByCode(
    documentCode: string,
    actorUserId: string,
    ctx?: RequestContext,
  ): Promise<DocumentResponse> {
    const document = await this.findActiveDocument(documentCode);

    // Log VIEW access (metadata only — no signed URL)
    await this.logAccess({
      documentId: document.id,
      actorUserId,
      action: FileAccessAction.VIEW,
      ctx,
      metadata: { documentCode },
    });

    return this.toResponse(document);
  }

  // ── Signed URL ─────────────────────────────────────────────────────────────

  /**
   * Returns document metadata + a short-lived signed URL for file access.
   *
   * Called ONLY after RBAC + ownership checks have passed (enforced by controller).
   *
   * Flow:
   *   1. Load Document record.
   *   2. (Ownership check is the controller's responsibility via @CurrentUser.)
   *   3. Generate signed URL via StorageService.
   *   4. Log DOWNLOAD access to FileAccessLog.
   *   5. Return metadata + signedUrl (no r2ObjectKey).
   *
   * @throws NotFoundException if document not found or soft-deleted.
   */
  async getSignedUrl(
    documentCode: string,
    actorUserId: string,
    ctx?: RequestContext,
    expiresInSeconds?: number,
  ): Promise<DocumentWithUrlResponse> {
    const document = await this.findActiveDocument(documentCode);

    // Generate signed URL (StorageService handles the R2 API call)
    const signedUrl = await this.storage.getSignedUrl(
      document.r2ObjectKey,
      expiresInSeconds,
    );

    // Compute expiry timestamp for the response
    const expiry = expiresInSeconds ?? 300;
    const expiresAt = new Date(Date.now() + expiry * 1000).toISOString();

    // Log DOWNLOAD access — signed URL itself is NOT logged (it expires)
    await this.logAccess({
      documentId: document.id,
      actorUserId,
      action: FileAccessAction.DOWNLOAD,
      ctx,
      metadata: {
        documentCode,
        expiresInSeconds: expiry,
      },
    });

    return {
      ...this.toResponse(document),
      signedUrl,
      signedUrlExpiresAt: expiresAt,
    };
  }

  // ── Soft delete ────────────────────────────────────────────────────────────

  /**
   * Soft-deletes a document: sets status=DELETED and deletedAt.
   * Physical R2 deletion is deferred to a background retention policy.
   *
   * @throws NotFoundException if document not found.
   */
  async softDelete(
    documentCode: string,
    actorUserId: string,
    ctx?: RequestContext,
  ): Promise<void> {
    const document = await this.findActiveDocument(documentCode);

    await this.prisma.document.update({
      where: { id: document.id },
      data: {
        status: DocumentStatus.DELETED,
        deletedAt: new Date(),
      },
    });

    // Log DELETE access
    await this.logAccess({
      documentId: document.id,
      actorUserId,
      action: FileAccessAction.DELETE,
      ctx,
      metadata: { documentCode },
    });

    this.audit.log({
      actorUserId,
      action: AuditAction.FILE.UPLOADED, // reuse FILE domain — specific delete action
      entityType: 'Document',
      entityId: documentCode,
      metadata: { documentType: document.documentType },
      ipAddress: ctx?.ipAddress,
      userAgent: ctx?.userAgent,
    });

    this.logger.log(
      `[DocumentsService] Document supprimé (soft): ${documentCode}`,
    );
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /**
   * Loads a Document by code, throwing NotFoundException if not found or deleted.
   */
  private async findActiveDocument(documentCode: string) {
    const document = await this.prisma.document.findUnique({
      where: { documentCode },
    });

    if (!document || document.status === DocumentStatus.DELETED) {
      throw new NotFoundException(`Document introuvable: "${documentCode}".`);
    }

    return document;
  }

  /**
   * Generates a unique document code: DOC-YYYY-NNNNN.
   * Finds the highest existing sequence for the current year and increments it.
   * Retries up to 3 times on race collision (the DB unique constraint is the safety net).
   */
  private async generateDocumentCode(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `DOC-${year}-`;

    for (let attempt = 0; attempt < 3; attempt++) {
      // Find the highest existing code for this year
      const last = await this.prisma.document.findFirst({
        where: { documentCode: { startsWith: prefix } },
        orderBy: { documentCode: 'desc' },
        select: { documentCode: true },
      });

      let nextSeq = 1;
      if (last) {
        const parts = last.documentCode.split('-');
        const lastSeq = parseInt(parts[2] ?? '0', 10);
        nextSeq = isNaN(lastSeq) ? 1 : lastSeq + 1;
      }

      const code = `${prefix}${String(nextSeq).padStart(5, '0')}`;

      // Optimistic check — DB unique constraint handles true collisions
      const exists = await this.prisma.document.findUnique({
        where: { documentCode: code },
      });
      if (!exists) return code;

      this.logger.warn(
        `[DocumentsService] Collision sur le code document ${code}, nouvel essai…`,
      );
    }

    // Fallback: use UUID suffix to guarantee uniqueness
    return `${prefix}${randomUUID().split('-')[0]}`;
  }

  /**
   * Writes a FileAccessLog entry. Never throws — audit must not crash requests.
   */
  private async logAccess(params: {
    documentId: string;
    actorUserId: string;
    action: FileAccessAction;
    ctx?: RequestContext;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      // JSON round-trip strips undefined values and satisfies Prisma's
      // InputJsonValue type (same pattern used in AuditService).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const safeMetadata: any = params.metadata
        ? JSON.parse(JSON.stringify(params.metadata))
        : undefined;

      await this.prisma.fileAccessLog.create({
        data: {
          documentId: params.documentId,
          actorUserId: params.actorUserId,
          action: params.action,
          ipAddress: params.ctx?.ipAddress ?? null,
          userAgent: params.ctx?.userAgent ?? null,
          metadata: safeMetadata,
        },
      });
    } catch (err: unknown) {
      // Log access tracking must never crash the main request
      this.logger.error(
        `[DocumentsService] Impossible d'enregistrer l'accès au fichier: ${String(err)}`,
      );
    }
  }

  /**
   * Maps a Prisma Document record to the public DocumentResponse shape.
   * NEVER includes r2ObjectKey, r2Bucket, checksum, or database id.
   */
  private toResponse(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    doc: Record<string, any>,
  ): DocumentResponse {
    return {
      documentCode: doc.documentCode as string,
      ownerType: doc.ownerType as string,
      ownerId: doc.ownerId as string,
      documentType: doc.documentType as DocumentType,
      originalFileName: doc.originalFileName as string,
      mimeType: doc.mimeType as string,
      fileSize: doc.fileSize as number,
      visibility: doc.visibility as DocumentVisibility,
      status: doc.status as DocumentStatus,
      createdAt: (doc.createdAt as Date).toISOString(),
      updatedAt: (doc.updatedAt as Date).toISOString(),
    };
  }
}
