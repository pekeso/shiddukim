import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Req,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Request } from 'express';
import { MembersService } from './members.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { QueryMembersDto } from './dto/query-members.dto';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { Permission } from '../common/constants/permissions';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import type {
  CreateMemberResult,
  MemberResponse,
  PaginatedMembers,
  PhotoUploadResponse,
  PhotoSignedUrlResponse,
} from './members.service';

/**
 * MembersController — manages church member records.
 *
 * Base path: /api/v1/members (global prefix + this controller path)
 *
 * All routes require a valid JWT (global JwtAuthGuard).
 * RBAC is enforced per route with @RequirePermissions().
 *
 * Key rules:
 *   - Never expose database IDs — use memberCode in all responses and URLs
 *   - Audit every create and update action
 *   - Duplicate detection warns (soft) on create — not a hard block
 *   - Members cannot change baptism data (enforced in UpdateMemberDto)
 *   - Photo upload requires member.update (secretaries and above)
 *   - Photo retrieval requires member.read; MEMBER role is limited to own photo
 */
@Controller('members')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  /**
   * POST /api/v1/members
   *
   * Creates a new church member record.
   * Requires: member.create permission (SUPER_ADMIN, CHURCH_ADMIN, SECRETARY)
   *
   * Returns the created member + any duplicate warnings.
   * HTTP 201 Created.
   */
  @Post()
  @RequirePermissions(Permission.MEMBER_CREATE)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateMemberDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ): Promise<CreateMemberResult> {
    return this.membersService.create(dto, user.id, {
      ipAddress: extractIp(req),
      userAgent: req.headers['user-agent'] ?? null,
    });
  }

  /**
   * GET /api/v1/members
   *
   * Lists members with optional filters (firstName, lastName, memberCode,
   * communityId) and pagination (page, limit).
   * Requires: member.read permission
   *
   * Returns paginated result: { data, total, page, limit, pages }
   */
  @Get()
  @RequirePermissions(Permission.MEMBER_READ)
  async findAll(@Query() query: QueryMembersDto): Promise<PaginatedMembers> {
    return this.membersService.findAll(query);
  }

  @Get('me')
  @RequirePermissions(Permission.MEMBER_READ)
  async findOwnProfile(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MemberResponse> {
    return this.membersService.findOwnProfile(user.id);
  }

  /**
   * GET /api/v1/members/:memberCode
   *
   * Retrieves a single member by their public member code.
   * Requires: member.read permission
   *
   * Returns 404 if the code does not exist.
   */
  @Get(':memberCode')
  @RequirePermissions(Permission.MEMBER_READ)
  async findOne(
    @Param('memberCode') memberCode: string,
  ): Promise<MemberResponse> {
    return this.membersService.findByCode(memberCode);
  }

  /**
   * PATCH /api/v1/members/:memberCode
   *
   * Updates basic member fields (personal information only).
   * Baptism data (baptismDate, baptizedBy) is intentionally excluded — members
   * cannot change church-official information.
   * Requires: member.update permission (SUPER_ADMIN, CHURCH_ADMIN, SECRETARY)
   *
   * Returns the updated member record.
   */
  @Patch(':memberCode')
  @RequirePermissions(Permission.MEMBER_UPDATE)
  async update(
    @Param('memberCode') memberCode: string,
    @Body() dto: UpdateMemberDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ): Promise<MemberResponse> {
    return this.membersService.update(memberCode, dto, user.id, {
      ipAddress: extractIp(req),
      userAgent: req.headers['user-agent'] ?? null,
    });
  }

  /**
   * GET /api/v1/members/:memberCode/qr-code
   *
   * Generates and returns the member's QR code as a base64-encoded PNG data URL.
   * The QR code encodes the memberCode string (e.g. "SHK-2026-00001").
   * Requires: member.read permission
   *
   * Response: { memberCode, qrCode } where qrCode is a data URL ("data:image/png;base64,…")
   */
  @Get(':memberCode/qr-code')
  @RequirePermissions(Permission.MEMBER_READ)
  async getQrCode(
    @Param('memberCode') memberCode: string,
  ): Promise<{ memberCode: string; qrCode: string }> {
    const qrCode = await this.membersService.getQrCode(memberCode);
    return { memberCode, qrCode };
  }

  // ── Photo endpoints ────────────────────────────────────────────────────────

  /**
   * POST /api/v1/members/:memberCode/photo
   *
   * Uploads a profile photo for a church member.
   *
   * Accepts: multipart/form-data with field "photo" (JPEG or PNG, max 5 MB).
   * Requires: member.update permission (SUPER_ADMIN, CHURCH_ADMIN, SECRETARY).
   *
   * Flow:
   *   1. File is stored in RAM (no disk write) during the request.
   *   2. MembersService validates MIME type (JPEG/PNG only) and size (≤ 5 MB).
   *   3. File is uploaded to Cloudflare R2 (folder: members/photos/).
   *   4. A Document record is created and linked to the member.
   *   5. Member.photoDocumentId is updated to reference the new document.
   *
   * Response: { documentCode, mimeType, fileSize } — never the r2ObjectKey.
   * HTTP 201 Created.
   */
  @Post(':memberCode/photo')
  @RequirePermissions(Permission.MEMBER_UPDATE)
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('photo', {
      // Memory storage — file lives in RAM and is streamed directly to R2.
      // A 10 MB Multer ceiling provides an early guard; the real 5 MB limit
      // is enforced inside MembersService.validatePhotoFile().
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB Multer ceiling
    }),
  )
  async uploadPhoto(
    @Param('memberCode') memberCode: string,
    @UploadedFile() file: Express.Multer.File | undefined,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ): Promise<PhotoUploadResponse> {
    if (!file) {
      throw new BadRequestException(
        'Aucun fichier reçu. Envoyez une image dans le champ "photo" (multipart/form-data).',
      );
    }

    return this.membersService.uploadPhoto(memberCode, file, user.id, {
      ipAddress: extractIp(req),
      userAgent: req.headers['user-agent'] ?? null,
    });
  }

  /**
   * GET /api/v1/members/:memberCode/photo
   *
   * Returns a short-lived signed URL (300 s) for a member's profile photo.
   * The signed URL allows direct access to the private R2 object.
   *
   * Authorization:
   *   - MEMBER role: can only access their own photo (enforced in service via UserMemberLink).
   *   - All other roles with member.read: can access any member's photo.
   *
   * Returns 404 if the member does not exist or has no uploaded photo.
   * Returns 403 if a MEMBER tries to access another member's photo.
   *
   * Response: { signedUrl, expiresAt } — never the r2ObjectKey.
   * HTTP 200 OK.
   */
  @Get(':memberCode/photo')
  @RequirePermissions(Permission.MEMBER_READ)
  async getPhoto(
    @Param('memberCode') memberCode: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ): Promise<PhotoSignedUrlResponse> {
    return this.membersService.getPhotoSignedUrl(
      memberCode,
      user.id,
      user.role,
      {
        ipAddress: extractIp(req),
        userAgent: req.headers['user-agent'] ?? null,
      },
    );
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractIp(req: Request): string | null {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const first = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    const ip = first.split(',')[0].trim();
    if (ip) return ip;
  }
  return req.socket?.remoteAddress ?? null;
}
