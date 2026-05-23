import { SetMetadata } from '@nestjs/common';
import type { Permission } from '../constants/permissions';

/**
 * Metadata key used by PermissionsGuard to read which permissions a route
 * requires before allowing access.
 */
export const PERMISSIONS_KEY = 'permissions';

/**
 * Declare which permissions a route requires.
 *
 * The current user must hold ALL listed permissions (logical AND).
 * If any required permission is absent from the user's role, PermissionsGuard
 * throws a French 403 ForbiddenException.
 *
 * Usage:
 *   @RequirePermissions(Permission.MEMBER_CREATE)
 *   async createMember() { ... }
 *
 *   @RequirePermissions(Permission.MARRIAGE_REVIEW, Permission.DOCUMENT_GENERATE)
 *   async reviewAndGenerate() { ... }
 */
export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
