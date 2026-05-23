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
} from '@nestjs/common';
import type { Request } from 'express';
import { MarriageService } from './marriage.service';
import { CreateMarriageRequestDto } from './dto/create-marriage-request.dto';
import { UpdatePastoralNotesDto } from './dto/update-pastoral-notes.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { UpdateClassificationDto } from './dto/update-classification.dto';
import { QueryMarriageRequestsDto } from './dto/query-marriage-requests.dto';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { Permission } from '../common/constants/permissions';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import type {
  MarriageRequestResponse,
  PaginatedMarriageRequests,
} from './marriage.service';

/**
 * MarriageController — manages marriage requests and pastoral workflow.
 *
 * Base path: /api/v1/marriage-requests (global prefix + this controller path)
 *
 * All routes require a valid JWT (global JwtAuthGuard).
 * RBAC is enforced per route with @RequirePermissions().
 *
 * Key rules:
 *   - Never expose internal `id` or `memberId` — use `requestCode` and `memberCode`
 *   - All status transitions are validated server-side (state machine)
 *   - All pastoral review and classification actions are audit-logged
 *   - MEMBER role can only access their own requests
 *   - Classification requires the marriage.classify permission (PASTOR only)
 */
@Controller('marriage-requests')
export class MarriageController {
  constructor(private readonly marriageService: MarriageService) {}

  /**
   * POST /api/v1/marriage-requests
   *
   * Creates a new marriage request in DRAFT status.
   * The requesting memberId is automatically resolved from the actor's
   * UserMemberLink — clients never send memberId directly.
   *
   * Requires: marriage.create permission (MEMBER, CHURCH_ADMIN)
   * HTTP 201 Created.
   */
  @Post()
  @RequirePermissions(Permission.MARRIAGE_CREATE)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateMarriageRequestDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ): Promise<MarriageRequestResponse> {
    return this.marriageService.create(dto, user.id, {
      ipAddress: extractIp(req),
      userAgent: req.headers['user-agent'] ?? null,
    });
  }

  /**
   * POST /api/v1/marriage-requests/:requestCode/submit
   *
   * Submits a marriage request for pastoral review (DRAFT → SUBMITTED).
   *
   * Validates:
   *   - Request is in DRAFT status.
   *   - spouseFullName is present.
   *   - At least one spouse contact (phone or email) is present.
   *   - MEMBER can only submit their own request.
   *
   * Audits: MARRIAGE.SUBMITTED
   * Requires: marriage.create permission
   * HTTP 200 OK.
   */
  @Post(':requestCode/submit')
  @RequirePermissions(Permission.MARRIAGE_CREATE)
  @HttpCode(HttpStatus.OK)
  async submit(
    @Param('requestCode') requestCode: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ): Promise<MarriageRequestResponse> {
    return this.marriageService.submit(requestCode, user.id, user.role, {
      ipAddress: extractIp(req),
      userAgent: req.headers['user-agent'] ?? null,
    });
  }

  /**
   * GET /api/v1/marriage-requests
   *
   * Lists marriage requests with optional status filter and pagination.
   *
   * Scoping:
   *   - MEMBER: sees only their own requests.
   *   - PASTOR / CHURCH_ADMIN / SUPER_ADMIN: sees all requests.
   *
   * Requires: marriage.review (pastor/admin) OR marriage.create (member, scoped)
   * Both permissions are checked — the most permissive is used.
   * HTTP 200 OK.
   */
  @Get()
  @RequirePermissions(Permission.MARRIAGE_CREATE)
  async findAll(
    @Query() query: QueryMarriageRequestsDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PaginatedMarriageRequests> {
    return this.marriageService.findAll(query, user.id, user.role);
  }

  /**
   * GET /api/v1/marriage-requests/:requestCode
   *
   * Returns the detail of a single marriage request.
   *
   * Authorization:
   *   - MEMBER: can only view their own request (403 otherwise).
   *   - Other roles with marriage.create or marriage.review: can view any request.
   *
   * Requires: marriage.create permission
   * HTTP 200 OK.
   */
  @Get(':requestCode')
  @RequirePermissions(Permission.MARRIAGE_CREATE)
  async findOne(
    @Param('requestCode') requestCode: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MarriageRequestResponse> {
    return this.marriageService.findByCode(requestCode, user.id, user.role);
  }

  /**
   * PATCH /api/v1/marriage-requests/:requestCode
   *
   * Updates the pastoral notes on a marriage request.
   * Sets reviewedAt to the current timestamp on every update.
   *
   * Requires: marriage.review permission (PASTOR, CHURCH_ADMIN, SUPER_ADMIN)
   * HTTP 200 OK.
   */
  @Patch(':requestCode')
  @RequirePermissions(Permission.MARRIAGE_REVIEW)
  async updatePastoralNotes(
    @Param('requestCode') requestCode: string,
    @Body() dto: UpdatePastoralNotesDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ): Promise<MarriageRequestResponse> {
    return this.marriageService.updatePastoralNotes(requestCode, dto, user.id, {
      ipAddress: extractIp(req),
      userAgent: req.headers['user-agent'] ?? null,
    });
  }

  /**
   * PATCH /api/v1/marriage-requests/:requestCode/status
   *
   * Changes the workflow status of a marriage request.
   * Transition must be valid according to ALLOWED_TRANSITIONS — invalid
   * transitions return HTTP 400 with a French error message.
   *
   * Audits: MARRIAGE.REVIEWED
   * Requires: marriage.review permission (PASTOR, CHURCH_ADMIN, SUPER_ADMIN)
   * HTTP 200 OK.
   */
  @Patch(':requestCode/status')
  @RequirePermissions(Permission.MARRIAGE_REVIEW)
  async updateStatus(
    @Param('requestCode') requestCode: string,
    @Body() dto: UpdateStatusDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ): Promise<MarriageRequestResponse> {
    return this.marriageService.updateStatus(requestCode, dto, user.id, {
      ipAddress: extractIp(req),
      userAgent: req.headers['user-agent'] ?? null,
    });
  }

  /**
   * PATCH /api/v1/marriage-requests/:requestCode/classification
   *
   * Sets the pastoral classification (GREEN / ORANGE / RED).
   * Only allowed when status is UNDER_REVIEW or later.
   *
   * Audits: MARRIAGE.CLASSIFIED
   * Requires: marriage.classify permission (PASTOR, SUPER_ADMIN only)
   * HTTP 200 OK.
   */
  @Patch(':requestCode/classification')
  @RequirePermissions(Permission.MARRIAGE_CLASSIFY)
  async updateClassification(
    @Param('requestCode') requestCode: string,
    @Body() dto: UpdateClassificationDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ): Promise<MarriageRequestResponse> {
    return this.marriageService.updateClassification(
      requestCode,
      dto,
      user.id,
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
