import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createHash, randomUUID } from 'crypto';
import { extname } from 'path';
import { R2Client } from './r2.client.js';
import type { EnvConfig } from '../common/config/env.validation.js';

// ─── MIME type allow-list ─────────────────────────────────────────────────────

/** Allowed MIME types for upload. Extend here as new file types are supported. */
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'application/pdf',
] as const;

type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

/** Maps MIME type to canonical file extension (used for object key generation). */
const MIME_TO_EXT: Record<AllowedMimeType, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'application/pdf': 'pdf',
};

// ─── Input / output types ─────────────────────────────────────────────────────

export interface UploadInput {
  /** Raw file buffer. */
  buffer: Buffer;
  /**
   * Logical folder / domain prefix, e.g. "members/photos" or "documents/uploads".
   * Must NOT start or end with a slash.
   */
  folder: string;
  /** MIME type declared by the caller — validated against the allow-list. */
  mimeType: string;
  /** Original file name (used only to derive extension if mimeType is ambiguous). */
  originalFileName: string;
  /** Database ID of the user performing the upload (for audit context). */
  uploadedByUserId: string;
}

export interface UploadResult {
  /** R2 object key, e.g. "members/photos/2026/05/<uuid>.jpg". NEVER returned to clients. */
  r2ObjectKey: string;
  /** Bucket name (from config). */
  bucket: string;
  /** Hex-encoded SHA-256 checksum of the uploaded file (computed before upload). */
  checksum: string;
  /** File size in bytes. */
  fileSize: number;
  /** Validated MIME type. */
  mimeType: string;
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * StorageService — handles all interactions with Cloudflare R2.
 *
 * Key rules:
 *   - Bucket is PRIVATE; signed URLs are the ONLY access path.
 *   - Object keys are UUID-based and must not contain personal data.
 *   - MIME type and file size are validated before upload.
 *   - SHA-256 checksum is computed before upload for integrity verification.
 *   - Signed URLs expire in R2_SIGNED_URL_EXPIRES_IN seconds (default 300).
 *   - This service is pure storage — RBAC and ownership checks are the
 *     caller's responsibility (DocumentsService / DocumentsController).
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly maxFileSizeBytes: number;
  private readonly defaultSignedUrlExpiresIn: number;

  constructor(
    private readonly r2: R2Client,
    private readonly configService: ConfigService<EnvConfig, true>,
  ) {
    const maxMb = this.configService.get('MAX_FILE_SIZE_MB', { infer: true });
    this.maxFileSizeBytes = (maxMb ?? 10) * 1024 * 1024;

    this.defaultSignedUrlExpiresIn =
      this.configService.get('R2_SIGNED_URL_EXPIRES_IN', { infer: true }) ??
      300;
  }

  // ── Upload ──────────────────────────────────────────────────────────────────

  /**
   * Validates and uploads a file buffer to Cloudflare R2.
   *
   * Steps:
   *   1. Validate MIME type against the allow-list.
   *   2. Validate file size against MAX_FILE_SIZE_MB.
   *   3. Compute SHA-256 checksum.
   *   4. Generate a UUID-based object key (no personal data).
   *   5. Upload via PutObjectCommand.
   *   6. Return metadata (key, bucket, checksum, size, mimeType).
   *
   * @throws BadRequestException   — invalid MIME type or file too large.
   * @throws InternalServerErrorException — R2 upload failure.
   */
  async upload(input: UploadInput): Promise<UploadResult> {
    // 1. Validate MIME type
    this.validateMimeType(input.mimeType);

    // 2. Validate file size
    this.validateFileSize(input.buffer.length);

    // 3. Compute SHA-256 checksum before uploading (integrity check)
    const checksum = this.computeChecksum(input.buffer);

    // 4. Generate object key: {folder}/{year}/{month}/{uuid}.{ext}
    const r2ObjectKey = this.generateObjectKey(
      input.folder,
      input.mimeType as AllowedMimeType,
      input.originalFileName,
    );

    // 5. Upload to R2
    try {
      await this.r2.client.send(
        new PutObjectCommand({
          Bucket: this.r2.bucketName,
          Key: r2ObjectKey,
          Body: input.buffer,
          ContentType: input.mimeType,
          ContentLength: input.buffer.length,
          // Store checksum in metadata for server-side verification
          Metadata: {
            'x-checksum-sha256': checksum,
            'x-uploaded-by': input.uploadedByUserId,
          },
        }),
      );
    } catch (err: unknown) {
      this.logger.error(
        `[StorageService] Échec de l'upload vers R2 (key: ${r2ObjectKey}): ${String(err)}`,
      );
      throw new InternalServerErrorException(
        "Échec de l'upload du fichier. Veuillez réessayer.",
      );
    }

    this.logger.log(
      `[StorageService] Fichier uploadé: ${r2ObjectKey} (${input.buffer.length} octets, ${input.mimeType})`,
    );

    return {
      r2ObjectKey,
      bucket: this.r2.bucketName,
      checksum,
      fileSize: input.buffer.length,
      mimeType: input.mimeType,
    };
  }

  // ── Signed URL ──────────────────────────────────────────────────────────────

  /**
   * Generates a short-lived signed URL for an R2 object.
   *
   * IMPORTANT: Call this ONLY after RBAC and ownership checks have passed.
   * This method does not perform any authorization — it trusts the caller.
   *
   * @param r2ObjectKey   — the stored object key (from Document.r2ObjectKey)
   * @param expiresInSeconds — URL lifetime in seconds (default: R2_SIGNED_URL_EXPIRES_IN)
   */
  async getSignedUrl(
    r2ObjectKey: string,
    expiresInSeconds?: number,
  ): Promise<string> {
    const expiry = expiresInSeconds ?? this.defaultSignedUrlExpiresIn;

    try {
      const command = new GetObjectCommand({
        Bucket: this.r2.bucketName,
        Key: r2ObjectKey,
      });

      return await getSignedUrl(this.r2.client, command, {
        expiresIn: expiry,
      });
    } catch (err: unknown) {
      this.logger.error(
        `[StorageService] Impossible de générer une URL signée pour ${r2ObjectKey}: ${String(err)}`,
      );
      throw new InternalServerErrorException(
        "Impossible de générer l'URL d'accès au fichier.",
      );
    }
  }

  // ── Delete ──────────────────────────────────────────────────────────────────

  /**
   * Physically deletes an object from R2.
   *
   * For MVP: documents are soft-deleted in the DB first; physical deletion
   * is a secondary cleanup step. The DB record is the source of truth.
   *
   * @param r2ObjectKey — the stored object key to delete.
   */
  async deleteObject(r2ObjectKey: string): Promise<void> {
    try {
      await this.r2.client.send(
        new DeleteObjectCommand({
          Bucket: this.r2.bucketName,
          Key: r2ObjectKey,
        }),
      );
      this.logger.log(`[StorageService] Objet R2 supprimé: ${r2ObjectKey}`);
    } catch (err: unknown) {
      // Log but do not throw — a failed physical delete should not crash
      // the workflow. The DB record will still be marked deleted.
      this.logger.error(
        `[StorageService] Impossible de supprimer l'objet R2 ${r2ObjectKey}: ${String(err)}`,
      );
    }
  }

  // ── Private helpers ─────────────────────────────────────────────────────────

  /**
   * Validates that the MIME type is in the allow-list.
   * @throws BadRequestException if not allowed.
   */
  private validateMimeType(mimeType: string): void {
    if (!ALLOWED_MIME_TYPES.includes(mimeType as AllowedMimeType)) {
      throw new BadRequestException(
        `Type de fichier non autorisé: "${mimeType}". ` +
          `Types acceptés: ${ALLOWED_MIME_TYPES.join(', ')}.`,
      );
    }
  }

  /**
   * Validates that the file size does not exceed MAX_FILE_SIZE_MB.
   * @throws BadRequestException if too large.
   */
  private validateFileSize(sizeInBytes: number): void {
    if (sizeInBytes > this.maxFileSizeBytes) {
      const maxMb = this.maxFileSizeBytes / 1024 / 1024;
      const actualMb = (sizeInBytes / 1024 / 1024).toFixed(2);
      throw new BadRequestException(
        `Fichier trop volumineux: ${actualMb} Mo. ` +
          `La taille maximale autorisée est de ${maxMb} Mo.`,
      );
    }
  }

  /**
   * Computes a SHA-256 checksum of the buffer.
   * Returns the hex-encoded digest.
   */
  private computeChecksum(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex');
  }

  /**
   * Generates a privacy-safe, UUID-based object key.
   *
   * Format: {folder}/{year}/{month}/{uuid}.{ext}
   * Example: members/photos/2026/05/a1b2c3d4-....jpg
   *
   * Rules:
   *   - UUID is random (no relationship to member code, name, or phone).
   *   - Extension is derived from MIME type (not from the original file name).
   *   - Year and month allow R2 lifecycle rules to target old objects.
   */
  private generateObjectKey(
    folder: string,
    mimeType: AllowedMimeType,
    originalFileName: string,
  ): string {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const uuid = randomUUID();

    // Prefer MIME-derived extension; fall back to original file name extension
    const ext =
      MIME_TO_EXT[mimeType] ??
      extname(originalFileName).replace('.', '') ??
      'bin';

    // Sanitise folder: remove leading/trailing slashes
    const cleanFolder = folder.replace(/^\/+|\/+$/g, '');

    return `${cleanFolder}/${year}/${month}/${uuid}.${ext}`;
  }
}
