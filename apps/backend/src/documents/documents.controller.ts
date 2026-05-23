import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UploadedFile,
  UseInterceptors,
  HttpCode,
  HttpStatus,
  Req,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Request } from 'express';
import { IsEnum, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { DocumentsService } from './documents.service.js';
import { UploadDocumentDto } from './dto/upload-document.dto.js';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator.js';
import { Permission } from '../common/constants/permissions.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy.js';
import type {
  DocumentResponse,
  DocumentWithUrlResponse,
  PaginatedDocuments,
  QueryDocumentsParams,
} from './documents.service.js';
import { DocumentType } from '@prisma/client';

// ── Query DTO for GET /documents ──────────────────────────────────────────────

class QueryDocumentsDto implements QueryDocumentsParams {
  @IsOptional()
  @IsEnum(DocumentType)
  documentType?: DocumentType;

  @IsOptional()
  ownerType?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

/**
 * DocumentsController — REST endpoints for file upload and signed URL access.
 *
 * Base path: /api/v1/documents
 *
 * Security rules:
 *   - All routes require a valid JWT (global JwtAuthGuard).
 *   - Upload requires `document.view` permission (all staff roles).
 *   - Metadata GET requires `document.view` permission.
 *   - Signed URL GET requires `document.view` permission + RBAC.
 *   - r2ObjectKey is NEVER returned in any response.
 *   - Every access is logged in FileAccessLog (done in DocumentsService).
 *
 * File upload:
 *   - Accepts multipart/form-data with field name "file".
 *   - File is stored in memory (no disk write) — validated and streamed to R2.
 *   - Max file size enforced by StorageService (MAX_FILE_SIZE_MB env var).
 *
 * IP and User-Agent extraction:
 *   - X-Forwarded-For is checked first (reverse proxy support).
 *   - Falls back to req.socket.remoteAddress.
 */
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  // ── GET /documents ────────────────────────────────────────────────────────

  /**
   * Lists documents visible to the authenticated user.
   *
   * Scoping rules:
   *   - MEMBER: only sees documents owned by their linked Member record and
   *     MarriageRequest records. Returns empty list if no member link.
   *   - All other roles with document.view: see all documents.
   *
   * Optional query params:
   *   - documentType: filter by DocumentType enum value
   *   - ownerType: filter by ownerType string (e.g. "Member", "MarriageRequest")
   *   - page: page number (default 1)
   *   - limit: items per page (default 20, max 100)
   *
   * Returns: { data, total, page, limit, pages }
   * HTTP 200 OK.
   */
  @Get()
  @RequirePermissions(Permission.DOCUMENT_VIEW)
  async findAll(
    @Query() query: QueryDocumentsDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ): Promise<PaginatedDocuments> {
    return this.documentsService.findAll(
      query,
      user.id,
      user.role,
      this.extractCtx(req),
    );
  }

  // ── POST /documents/upload ─────────────────────────────────────────────────

  /**
   * Uploads a supporting document to Cloudflare R2.
   *
   * Accepts: multipart/form-data
   *   - file: the binary file (JPEG, PNG, or PDF)
   *   - documentType: enum value
   *   - ownerType: entity type that owns the document (e.g. "Member")
   *   - ownerId: internal DB id of the owning entity
   *
   * Requires: document.view permission (SUPER_ADMIN, CHURCH_ADMIN, SECRETARY, PASTOR)
   *
   * Returns: DocumentResponse (metadata only — no r2ObjectKey, no signed URL)
   * HTTP 201 Created.
   */
  @Post('upload')
  @RequirePermissions(Permission.DOCUMENT_VIEW)
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('file', {
      // Store in memory so we can compute checksum and upload to R2 without
      // writing to disk. For large files, a streaming approach is better —
      // this is sufficient for MVP (max ~10 MB).
      storage: memoryStorage(),
      // Multer size limit as an early guard; StorageService enforces the real limit.
      limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB multer ceiling
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: UploadDocumentDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ): Promise<DocumentResponse> {
    if (!file) {
      throw new BadRequestException(
        'Aucun fichier reçu. Envoyez un fichier dans le champ "file" (multipart/form-data).',
      );
    }

    return this.documentsService.upload(
      file,
      dto,
      user.id,
      this.extractCtx(req),
    );
  }

  // ── GET /documents/:documentCode ───────────────────────────────────────────

  /**
   * Returns document metadata by documentCode.
   * Does NOT return a signed URL or the R2 object key.
   *
   * Use GET /documents/:documentCode/url to get a signed URL for file access.
   *
   * Requires: document.view permission.
   * HTTP 200 OK.
   */
  @Get(':documentCode')
  @RequirePermissions(Permission.DOCUMENT_VIEW)
  async findOne(
    @Param('documentCode') documentCode: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ): Promise<DocumentResponse> {
    return this.documentsService.findByCode(
      documentCode,
      user.id,
      this.extractCtx(req),
    );
  }

  // ── GET /documents/:documentCode/url ──────────────────────────────────────

  /**
   * Returns a short-lived signed URL for the document's file.
   *
   * The signed URL expires in R2_SIGNED_URL_EXPIRES_IN seconds (default 300).
   * An optional ?expiresIn=<seconds> query param overrides the default (max 3600).
   *
   * This endpoint:
   *   1. Loads the Document record.
   *   2. Generates a signed URL via StorageService.
   *   3. Logs the access to FileAccessLog (DOWNLOAD action).
   *   4. Returns metadata + signedUrl + signedUrlExpiresAt.
   *
   * NEVER returns the raw R2 object key.
   *
   * Requires: document.view permission.
   * HTTP 200 OK.
   */
  @Get(':documentCode/url')
  @RequirePermissions(Permission.DOCUMENT_VIEW)
  async getSignedUrl(
    @Param('documentCode') documentCode: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
    @Query('expiresIn', new DefaultValuePipe(300), ParseIntPipe)
    expiresIn: number,
  ): Promise<DocumentWithUrlResponse> {
    // Cap signed URL lifetime at 1 hour for security
    const clampedExpiry = Math.min(Math.max(expiresIn, 30), 3600);

    return this.documentsService.getSignedUrl(
      documentCode,
      user.id,
      user.role,
      this.extractCtx(req),
      clampedExpiry,
    );
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /**
   * Extracts IP address and User-Agent from the request for audit / access logging.
   * Checks X-Forwarded-For first (reverse proxy support).
   */
  private extractCtx(req: Request): { ipAddress: string; userAgent: string } {
    const forwarded = req.headers['x-forwarded-for'];
    const ip =
      (Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0]) ??
      req.socket.remoteAddress ??
      '';

    return {
      ipAddress: ip,
      userAgent: req.headers['user-agent'] ?? '',
    };
  }
}
