import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CommunitiesService } from './communities.service';
import { CreateCommunityDto } from './dto/create-community.dto';
import { UpdateCommunityDto } from './dto/update-community.dto';
import { AssignMemberDto } from './dto/assign-member.dto';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { Permission } from '../common/constants/permissions';
import type {
  CommunityResponse,
  CommunityWithMemberCount,
} from './communities.service';

/**
 * CommunitiesController — manages church communities.
 *
 * Base path: /api/v1/communities (global prefix + this controller path)
 *
 * All routes require a valid JWT (global JwtAuthGuard).
 * RBAC is enforced per route with @RequirePermissions().
 *
 * Communities (also called cells, choirs, etc.) are sub-groups to which
 * members can be assigned. Each has an optional president (a member).
 *
 * Note: community IDs (UUIDs) are used in these routes because communities
 * do not have a human-readable public code. Unlike members, community IDs
 * are safe to expose since they carry no personal data.
 */
@Controller('communities')
export class CommunitiesController {
  constructor(private readonly communitiesService: CommunitiesService) {}

  /**
   * POST /api/v1/communities
   *
   * Creates a new church community.
   * Requires: community.create permission (SUPER_ADMIN, CHURCH_ADMIN)
   *
   * If presidentMemberCode is provided, the corresponding member is set as
   * the community president.
   */
  @Post()
  @RequirePermissions(Permission.COMMUNITY_CREATE)
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateCommunityDto): Promise<CommunityResponse> {
    return this.communitiesService.create(dto);
  }

  /**
   * GET /api/v1/communities
   *
   * Lists all communities with their member count.
   * Requires: member.read permission (read access is needed to see communities)
   *
   * Returns an array sorted alphabetically by name.
   */
  @Get()
  @RequirePermissions(Permission.MEMBER_READ)
  async findAll(): Promise<CommunityWithMemberCount[]> {
    return this.communitiesService.findAll();
  }

  /**
   * GET /api/v1/communities/:id
   *
   * Retrieves a single community with its member count.
   * Requires: member.read permission
   *
   * Returns 404 if the community does not exist.
   */
  @Get(':id')
  @RequirePermissions(Permission.MEMBER_READ)
  async findOne(@Param('id') id: string): Promise<CommunityWithMemberCount> {
    return this.communitiesService.findOne(id);
  }

  /**
   * PATCH /api/v1/communities/:id
   *
   * Updates a community's name, description, or president.
   * Requires: community.update permission (SUPER_ADMIN, CHURCH_ADMIN)
   *
   * Returns the updated community record.
   */
  @Patch(':id')
  @RequirePermissions(Permission.COMMUNITY_UPDATE)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCommunityDto,
  ): Promise<CommunityResponse> {
    return this.communitiesService.update(id, dto);
  }

  /**
   * POST /api/v1/communities/:id/members
   *
   * Assigns an existing member to this community.
   * Requires: member.update permission (allows reassigning community membership)
   *
   * Body: { memberCode: "SHK-2026-00001" }
   *
   * Returns a confirmation message.
   * Returns 409 if the member is already in this community.
   */
  @Post(':id/members')
  @RequirePermissions(Permission.MEMBER_UPDATE)
  @HttpCode(HttpStatus.OK)
  async assignMember(
    @Param('id') id: string,
    @Body() dto: AssignMemberDto,
  ): Promise<{ message: string }> {
    return this.communitiesService.assignMember(id, dto.memberCode);
  }
}
