import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as QRCode from 'qrcode';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../common/constants/audit-actions';
import { StorageService } from '../storage/storage.service';
import {
  DocumentType,
  DocumentStatus,
  DocumentVisibility,
  FileAccessAction,
} from '../../generated/prisma/client.js';
import type { CreateMemberDto } from './dto/create-member.dto';
import type { UpdateMemberDto } from './dto/update-member.dto';
import type { QueryMembersDto } from './dto/query-members.dto';
import type { RequestContext } from '../auth/auth.service';
import type { Prisma } from '../../generated/prisma/client.js';

// ─── Photo upload / retrieval limits ─────────────────────────────────────────

/** Member photos: only JPEG and PNG are accepted. */
const PHOTO_ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png'] as const;

/** Maximum size for member profile photos (5 MB). */
const PHOTO_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

// ─── Response shapes ──────────────────────────────────────────────────────────

export interface MemberResponse {
  memberCode: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  gender: string | null;
  dateOfBirth: string | null;
  placeOfBirth: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  communityId: string | null;
  baptismDate: string | null;
  baptizedBy: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface DuplicateWarning {
  field: 'name+dateOfBirth' | 'phone' | 'email';
  memberCode: string;
  message: string;
}

export interface CreateMemberResult {
  member: MemberResponse;
  duplicateWarnings: DuplicateWarning[];
}

export interface PaginatedMembers {
  data: MemberResponse[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

/** Returned after a successful photo upload. Never includes r2ObjectKey. */
export interface PhotoUploadResponse {
  documentCode: string;
  mimeType: string;
  fileSize: number;
}

/** Returned when a member's photo signed URL is requested. */
export interface PhotoSignedUrlResponse {
  signedUrl: string;
  /** ISO 8601 timestamp — when the signed URL expires. */
  expiresAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class MembersService {
  private readonly logger = new Logger(MembersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly storage: StorageService,
  ) {}

  // ── Create ─────────────────────────────────────────────────────────────────

  async create(
    dto: CreateMemberDto,
    actorUserId: string,
    ctx?: RequestContext,
  ): Promise<CreateMemberResult> {
    // 1. Check for duplicates (soft warning — not a hard block)
    const duplicateWarnings = await this.detectDuplicates(dto);

    // 2. Generate unique member code (SHK-YYYY-NNNNN)
    const memberCode = await this.generateMemberCode();

    // 3. Persist the member record
    const member = await this.prisma.member.create({
      data: {
        memberCode,
        firstName: dto.firstName,
        middleName: dto.middleName ?? null,
        lastName: dto.lastName,
        gender: dto.gender ?? null,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
        placeOfBirth: dto.placeOfBirth ?? null,
        address: dto.address ?? null,
        phone: dto.phone ?? null,
        email: dto.email ?? null,
        communityId: dto.communityId ?? null,
        baptismDate: dto.baptismDate ? new Date(dto.baptismDate) : null,
        baptizedBy: dto.baptizedBy ?? null,
      },
    });

    // 4. Audit — fire-and-forget
    this.audit.log({
      actorUserId,
      action: AuditAction.MEMBER.CREATED,
      entityType: 'Member',
      entityId: member.memberCode,
      metadata: {
        memberCode: member.memberCode,
        firstName: member.firstName,
        lastName: member.lastName,
        communityId: member.communityId,
        hasDuplicateWarnings: duplicateWarnings.length > 0,
      },
      ipAddress: ctx?.ipAddress,
      userAgent: ctx?.userAgent,
    });

    return {
      member: this.toResponse(member),
      duplicateWarnings,
    };
  }

  // ── List ───────────────────────────────────────────────────────────────────

  async findAll(query: QueryMembersDto): Promise<PaginatedMembers> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    // Build dynamic WHERE clause
    const where: Prisma.MemberWhereInput = {};

    if (query.firstName) {
      where.firstName = { contains: query.firstName, mode: 'insensitive' };
    }
    if (query.lastName) {
      where.lastName = { contains: query.lastName, mode: 'insensitive' };
    }
    if (query.memberCode) {
      where.memberCode = query.memberCode;
    }
    if (query.communityId) {
      where.communityId = query.communityId;
    }

    const [members, total] = await Promise.all([
      this.prisma.member.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      }),
      this.prisma.member.count({ where }),
    ]);

    return {
      data: members.map((m) => this.toResponse(m)),
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  // ── Find one by public code ────────────────────────────────────────────────

  async findByCode(memberCode: string): Promise<MemberResponse> {
    const member = await this.prisma.member.findUnique({
      where: { memberCode },
    });
    if (!member) {
      throw new NotFoundException(
        `Aucun fidèle trouvé avec le code ${memberCode}.`,
      );
    }
    return this.toResponse(member);
  }

  // ── Update (basic fields only — no baptism data) ──────────────────────────

  async update(
    memberCode: string,
    dto: UpdateMemberDto,
    actorUserId: string,
    ctx?: RequestContext,
  ): Promise<MemberResponse> {
    const existing = await this.prisma.member.findUnique({
      where: { memberCode },
    });
    if (!existing) {
      throw new NotFoundException(
        `Aucun fidèle trouvé avec le code ${memberCode}.`,
      );
    }

    // Collect changed fields for the audit log
    const changedFields: Record<string, { from: unknown; to: unknown }> = {};

    const updateData: Record<string, unknown> = {};

    if (dto.firstName !== undefined && dto.firstName !== existing.firstName) {
      changedFields['firstName'] = {
        from: existing.firstName,
        to: dto.firstName,
      };
      updateData['firstName'] = dto.firstName;
    }
    if (
      dto.middleName !== undefined &&
      dto.middleName !== existing.middleName
    ) {
      changedFields['middleName'] = {
        from: existing.middleName,
        to: dto.middleName,
      };
      updateData['middleName'] = dto.middleName;
    }
    if (dto.lastName !== undefined && dto.lastName !== existing.lastName) {
      changedFields['lastName'] = {
        from: existing.lastName,
        to: dto.lastName,
      };
      updateData['lastName'] = dto.lastName;
    }
    if (dto.gender !== undefined && dto.gender !== existing.gender) {
      changedFields['gender'] = { from: existing.gender, to: dto.gender };
      updateData['gender'] = dto.gender;
    }
    if (dto.dateOfBirth !== undefined) {
      const newDate = new Date(dto.dateOfBirth);
      if (
        !existing.dateOfBirth ||
        newDate.toISOString() !== existing.dateOfBirth.toISOString()
      ) {
        changedFields['dateOfBirth'] = {
          from: existing.dateOfBirth?.toISOString() ?? null,
          to: dto.dateOfBirth,
        };
        updateData['dateOfBirth'] = newDate;
      }
    }
    if (
      dto.placeOfBirth !== undefined &&
      dto.placeOfBirth !== existing.placeOfBirth
    ) {
      changedFields['placeOfBirth'] = {
        from: existing.placeOfBirth,
        to: dto.placeOfBirth,
      };
      updateData['placeOfBirth'] = dto.placeOfBirth;
    }
    if (dto.address !== undefined && dto.address !== existing.address) {
      changedFields['address'] = { from: existing.address, to: dto.address };
      updateData['address'] = dto.address;
    }
    if (dto.phone !== undefined && dto.phone !== existing.phone) {
      changedFields['phone'] = { from: existing.phone, to: dto.phone };
      updateData['phone'] = dto.phone;
    }
    if (dto.email !== undefined && dto.email !== existing.email) {
      changedFields['email'] = { from: existing.email, to: dto.email };
      updateData['email'] = dto.email;
    }

    // No-op if nothing changed
    if (Object.keys(updateData).length === 0) {
      return this.toResponse(existing);
    }

    const updated = await this.prisma.member.update({
      where: { memberCode },
      data: updateData,
    });

    // Audit — fire-and-forget, include changed fields in metadata
    this.audit.log({
      actorUserId,
      action: AuditAction.MEMBER.UPDATED,
      entityType: 'Member',
      entityId: memberCode,
      metadata: { changedFields },
      ipAddress: ctx?.ipAddress,
      userAgent: ctx?.userAgent,
    });

    return this.toResponse(updated);
  }

  // ── QR code ────────────────────────────────────────────────────────────────

  /**
   * Returns the member's QR code as a base64-encoded PNG data URL.
   * The QR code content is the memberCode (e.g. "SHK-2026-00001").
   */
  async getQrCode(memberCode: string): Promise<string> {
    // Ensure the member exists before generating
    const exists = await this.prisma.member.findUnique({
      where: { memberCode },
      select: { memberCode: true },
    });
    if (!exists) {
      throw new NotFoundException(
        `Aucun fidèle trouvé avec le code ${memberCode}.`,
      );
    }

    // Generate QR code as base64 data URL (PNG)
    const dataUrl = await QRCode.toDataURL(memberCode, {
      errorCorrectionLevel: 'M',
      width: 300,
      margin: 2,
    });

    return dataUrl;
  }

  // ── Photo upload ───────────────────────────────────────────────────────────

  /**
   * Uploads a profile photo for a church member.
   *
   * Flow:
   *   1. Verify the member exists.
   *   2. Validate the file (JPEG / PNG only, max 5 MB).
   *   3. Upload to R2 via StorageService (folder: members/photos).
   *   4. Generate a unique documentCode (DOC-YYYY-NNNNN).
   *   5. Create a Document record (documentType: MEMBER_PHOTO).
   *   6. Update Member.photoDocumentId to point to the new document.
   *   7. Write a FileAccessLog entry (UPLOAD action).
   *   8. Fire-and-forget AuditLog (FILE.UPLOADED).
   *   9. Return document metadata — never the r2ObjectKey.
   *
   * If the member already has a photo, the reference is updated to the new one.
   * The old Document record is kept (soft-delete deferred to retention policy).
   *
   * @throws NotFoundException    — member not found.
   * @throws BadRequestException  — invalid file type or size.
   * @throws InternalServerError  — R2 upload failure (thrown by StorageService).
   */
  async uploadPhoto(
    memberCode: string,
    file: Express.Multer.File,
    actorUserId: string,
    ctx?: RequestContext,
  ): Promise<PhotoUploadResponse> {
    // 1. Verify member exists and get internal id
    const member = await this.findMemberOrThrow(memberCode);

    // 2. Validate file type and size (stricter than global StorageService rules)
    this.validatePhotoFile(file);

    // 3. Upload to R2
    const uploadResult = await this.storage.upload({
      buffer: file.buffer,
      folder: 'members/photos',
      mimeType: file.mimetype,
      originalFileName: file.originalname,
      uploadedByUserId: actorUserId,
    });

    // 4. Generate unique document code
    const documentCode = await this.generateDocumentCode();

    // 5. Derive stored file name from the R2 object key (UUID.ext portion)
    const keyParts = uploadResult.r2ObjectKey.split('/');
    const storedFileName =
      keyParts[keyParts.length - 1] ?? `${randomUUID()}.jpg`;

    // 6. Create Document record in PostgreSQL
    const document = await this.prisma.document.create({
      data: {
        documentCode,
        ownerType: 'Member',
        ownerId: member.id, // internal DB id — never returned to clients
        documentType: DocumentType.MEMBER_PHOTO,
        visibility: DocumentVisibility.PRIVATE,
        status: DocumentStatus.ACTIVE,
        originalFileName: file.originalname,
        storedFileName,
        r2Bucket: uploadResult.bucket,
        r2ObjectKey: uploadResult.r2ObjectKey, // NEVER returned to clients
        mimeType: uploadResult.mimeType,
        fileSize: uploadResult.fileSize,
        checksum: uploadResult.checksum,
        uploadedByUserId: actorUserId,
        generatedByUserId: null,
      },
    });

    // 7. Update Member.photoDocumentId to reference the new Document
    await this.prisma.member.update({
      where: { memberCode },
      data: { photoDocumentId: document.id },
    });

    // 8. Log file access (UPLOAD)
    await this.logFileAccess({
      documentId: document.id,
      actorUserId,
      action: FileAccessAction.UPLOAD,
      ctx,
      metadata: {
        documentCode,
        memberCode,
        mimeType: uploadResult.mimeType,
        fileSize: uploadResult.fileSize,
      },
    });

    // 9. Audit — fire-and-forget
    this.audit.log({
      actorUserId,
      action: AuditAction.FILE.UPLOADED,
      entityType: 'Document',
      entityId: documentCode,
      metadata: {
        documentType: DocumentType.MEMBER_PHOTO,
        memberCode,
        fileSize: uploadResult.fileSize,
        mimeType: uploadResult.mimeType,
      },
      ipAddress: ctx?.ipAddress,
      userAgent: ctx?.userAgent,
    });

    this.logger.log(
      `[MembersService] Photo uploadée pour le fidèle ${memberCode}: ${documentCode}`,
    );

    return {
      documentCode,
      mimeType: uploadResult.mimeType,
      fileSize: uploadResult.fileSize,
    };
  }

  // ── Photo retrieval ────────────────────────────────────────────────────────

  /**
   * Returns a short-lived signed URL for a member's profile photo.
   *
   * Authorization rules:
   *   - MEMBER role: can only access their own photo (verified via UserMemberLink).
   *   - All other roles (SUPER_ADMIN, CHURCH_ADMIN, SECRETARY, PASTOR, COMMUNITY_LEADER):
   *     can access any member's photo.
   *
   * Flow:
   *   1. Verify the member exists.
   *   2. Check the member has a photo (404 if not).
   *   3. Enforce ownership for MEMBER role.
   *   4. Load the Document record.
   *   5. Generate a signed URL (default 300s expiry) via StorageService.
   *   6. Write a FileAccessLog entry (VIEW action).
   *   7. Return { signedUrl, expiresAt } — never the r2ObjectKey.
   *
   * @throws NotFoundException   — member not found or has no photo.
   * @throws ForbiddenException  — MEMBER trying to access another member's photo.
   */
  async getPhotoSignedUrl(
    memberCode: string,
    actorUserId: string,
    actorRole: string,
    ctx?: RequestContext,
  ): Promise<PhotoSignedUrlResponse> {
    // 1. Verify member exists
    const member = await this.findMemberOrThrow(memberCode);

    // 2. Check the member has an uploaded photo
    if (!member.photoDocumentId) {
      throw new NotFoundException(
        `Le fidèle ${memberCode} n'a pas encore de photo de profil.`,
      );
    }

    // 3. MEMBER role: enforce ownership via UserMemberLink
    if (actorRole === 'MEMBER') {
      const link = await this.prisma.userMemberLink.findFirst({
        where: { userId: actorUserId, memberId: member.id },
        select: { id: true },
      });

      if (!link) {
        throw new ForbiddenException(
          "Vous n'êtes pas autorisé à accéder à la photo de ce fidèle.",
        );
      }
    }

    // 4. Load the Document record
    const document = await this.prisma.document.findUnique({
      where: { id: member.photoDocumentId },
    });

    if (!document || document.status === DocumentStatus.DELETED) {
      throw new NotFoundException(
        `La photo de profil du fidèle ${memberCode} est introuvable.`,
      );
    }

    // 5. Generate signed URL (300s default — private bucket, access-controlled)
    const expiresInSeconds = 300;
    const signedUrl = await this.storage.getSignedUrl(
      document.r2ObjectKey,
      expiresInSeconds,
    );
    const expiresAt = new Date(
      Date.now() + expiresInSeconds * 1000,
    ).toISOString();

    // 6. Log file access (VIEW) — signed URL itself is NOT logged
    await this.logFileAccess({
      documentId: document.id,
      actorUserId,
      action: FileAccessAction.VIEW,
      ctx,
      metadata: {
        documentCode: document.documentCode,
        memberCode,
      },
    });

    this.logger.log(
      `[MembersService] URL signée générée pour la photo de ${memberCode} (acteur: ${actorUserId})`,
    );

    return { signedUrl, expiresAt };
  }

  // ── Member code generation ─────────────────────────────────────────────────

  /**
   * Generates a unique member code in the format SHK-YYYY-NNNNN.
   *
   * Strategy:
   *   1. Find the highest existing sequence number for the current year.
   *   2. Increment by 1 and format as a zero-padded 5-digit number.
   *   3. Retry up to 3 times on unique constraint violation (race condition).
   *
   * Example: SHK-2026-00001, SHK-2026-00002, …, SHK-2026-99999
   */
  private async generateMemberCode(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `SHK-${year}-`;

    for (let attempt = 0; attempt < 3; attempt++) {
      // Find the member with the highest code for this year
      const last = await this.prisma.member.findFirst({
        where: { memberCode: { startsWith: prefix } },
        orderBy: { memberCode: 'desc' },
        select: { memberCode: true },
      });

      let nextSeq = 1;
      if (last) {
        // Extract the numeric suffix (last 5 chars) and increment
        const suffix = last.memberCode.slice(prefix.length);
        nextSeq = parseInt(suffix, 10) + 1;
      }

      const candidate = `${prefix}${String(nextSeq).padStart(5, '0')}`;

      // Check for existence (guards against race conditions during generation)
      const collision = await this.prisma.member.findUnique({
        where: { memberCode: candidate },
        select: { memberCode: true },
      });

      if (!collision) {
        return candidate;
      }

      // Collision detected — retry with incremented sequence
      this.logger.warn(
        `Collision de code membre détectée pour ${candidate}, nouvelle tentative ${attempt + 1}/3`,
      );
    }

    // Extremely unlikely but safe fallback — add a timestamp suffix
    const fallback = `${prefix}${Date.now()}`;
    this.logger.error(
      `Impossible de générer un code unique après 3 tentatives — fallback: ${fallback}`,
    );
    return fallback;
  }

  // ── Duplicate detection ────────────────────────────────────────────────────

  /**
   * Checks for potential duplicate members on three signals:
   *   1. Same firstName + lastName + dateOfBirth
   *   2. Same phone number
   *   3. Same email address
   *
   * Returns warnings (soft — not a hard block) so the UI can prompt for
   * confirmation before saving.
   */
  private async detectDuplicates(
    dto: CreateMemberDto,
  ): Promise<DuplicateWarning[]> {
    const warnings: DuplicateWarning[] = [];

    // Check 1: name + date of birth combination
    if (dto.dateOfBirth) {
      const nameDobMatch = await this.prisma.member.findFirst({
        where: {
          firstName: { equals: dto.firstName, mode: 'insensitive' },
          lastName: { equals: dto.lastName, mode: 'insensitive' },
          dateOfBirth: new Date(dto.dateOfBirth),
        },
        select: { memberCode: true },
      });
      if (nameDobMatch) {
        warnings.push({
          field: 'name+dateOfBirth',
          memberCode: nameDobMatch.memberCode,
          message: `Un fidèle avec le même nom et la même date de naissance existe déjà (${nameDobMatch.memberCode}).`,
        });
      }
    }

    // Check 2: phone number
    if (dto.phone) {
      const phoneMatch = await this.prisma.member.findFirst({
        where: { phone: dto.phone },
        select: { memberCode: true },
      });
      if (phoneMatch) {
        warnings.push({
          field: 'phone',
          memberCode: phoneMatch.memberCode,
          message: `Ce numéro de téléphone est déjà utilisé par le fidèle ${phoneMatch.memberCode}.`,
        });
      }
    }

    // Check 3: email address
    if (dto.email) {
      const emailMatch = await this.prisma.member.findFirst({
        where: { email: { equals: dto.email, mode: 'insensitive' } },
        select: { memberCode: true },
      });
      if (emailMatch) {
        warnings.push({
          field: 'email',
          memberCode: emailMatch.memberCode,
          message: `Cette adresse e-mail est déjà utilisée par le fidèle ${emailMatch.memberCode}.`,
        });
      }
    }

    return warnings;
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /**
   * Loads a member by memberCode, returning the full Prisma record (including
   * internal `id`). Throws NotFoundException if not found.
   * Used internally for operations that need the internal id (e.g. photo upload).
   */
  private async findMemberOrThrow(memberCode: string) {
    const member = await this.prisma.member.findUnique({
      where: { memberCode },
    });
    if (!member) {
      throw new NotFoundException(
        `Aucun fidèle trouvé avec le code ${memberCode}.`,
      );
    }
    return member;
  }

  /**
   * Validates that the uploaded file is an accepted image type and within
   * the photo size limit (5 MB).
   *
   * Photo rules (stricter than the global StorageService allow-list):
   *   - Only image/jpeg and image/png are accepted (no PDF).
   *   - Max 5 MB (global StorageService limit is 10 MB).
   *
   * @throws BadRequestException on type or size violation.
   */
  private validatePhotoFile(file: Express.Multer.File): void {
    if (
      !PHOTO_ALLOWED_MIME_TYPES.includes(
        file.mimetype as 'image/jpeg' | 'image/png',
      )
    ) {
      throw new BadRequestException(
        `Type de fichier non autorisé pour une photo: "${file.mimetype}". ` +
          `Seuls les formats JPEG et PNG sont acceptés.`,
      );
    }

    if (file.size > PHOTO_MAX_FILE_SIZE_BYTES) {
      const actualMb = (file.size / 1024 / 1024).toFixed(2);
      throw new BadRequestException(
        `Photo trop volumineuse: ${actualMb} Mo. ` +
          `La taille maximale autorisée est de 5 Mo.`,
      );
    }
  }

  /**
   * Generates a unique document code: DOC-YYYY-NNNNN.
   * Mirrors the same strategy used in DocumentsService.
   * Retries up to 3 times on race collision; falls back to a UUID suffix.
   */
  private async generateDocumentCode(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `DOC-${year}-`;

    for (let attempt = 0; attempt < 3; attempt++) {
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

      const exists = await this.prisma.document.findUnique({
        where: { documentCode: code },
      });
      if (!exists) return code;

      this.logger.warn(
        `[MembersService] Collision sur le code document ${code}, nouvel essai…`,
      );
    }

    return `${prefix}${randomUUID().split('-')[0]}`;
  }

  /**
   * Writes a FileAccessLog entry. Never throws — file access tracking must not
   * crash the main request flow.
   *
   * Follows the same fire-and-catch pattern as DocumentsService.logAccess().
   */
  private async logFileAccess(params: {
    documentId: string;
    actorUserId: string;
    action: FileAccessAction;
    ctx?: RequestContext;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      // JSON round-trip strips undefined values and satisfies Prisma's
      // InputJsonValue type (same pattern used in AuditService and DocumentsService).
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
      this.logger.error(
        `[MembersService] Impossible d'enregistrer l'accès au fichier: ${String(err)}`,
      );
    }
  }

  /**
   * Maps a Prisma Member record to a safe API response shape.
   * Never exposes the internal database `id` or `photoDocumentId` fields.
   */
  private toResponse(member: {
    memberCode: string;
    firstName: string;
    middleName: string | null;
    lastName: string;
    gender: string | null;
    dateOfBirth: Date | null;
    placeOfBirth: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
    communityId: string | null;
    baptismDate: Date | null;
    baptizedBy: string | null;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  }): MemberResponse {
    return {
      memberCode: member.memberCode,
      firstName: member.firstName,
      middleName: member.middleName,
      lastName: member.lastName,
      gender: member.gender,
      dateOfBirth: member.dateOfBirth?.toISOString() ?? null,
      placeOfBirth: member.placeOfBirth,
      address: member.address,
      phone: member.phone,
      email: member.email,
      communityId: member.communityId,
      baptismDate: member.baptismDate?.toISOString() ?? null,
      baptizedBy: member.baptizedBy,
      status: member.status,
      createdAt: member.createdAt.toISOString(),
      updatedAt: member.updatedAt.toISOString(),
    };
  }
}
