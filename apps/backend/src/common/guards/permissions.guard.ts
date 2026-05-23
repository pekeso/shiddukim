import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import type { Permission } from '../constants/permissions';
import { ROLE_PERMISSIONS } from '../constants/role-permissions';
import type { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';
import type { Role } from '@prisma/client';

/**
 * PermissionsGuard — enforces RBAC on every protected route.
 *
 * Execution order (all APP_GUARDs):
 *   1. ThrottlerGuard  — rate limiting
 *   2. JwtAuthGuard    — JWT validation → populates request.user
 *   3. PermissionsGuard — this guard; checks request.user.role against
 *                         the permissions declared by @RequirePermissions()
 *
 * Skip conditions:
 *   - Route is decorated with @Public()         → no check
 *   - Route has no @RequirePermissions() metadata → authenticated access,
 *     no specific permission required
 *
 * On failure: throws a French 403 ForbiddenException.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // ── Public routes skip all checks ──────────────────────────────────────────
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    // ── Read required permissions from route metadata ──────────────────────────
    const requiredPermissions = this.reflector.getAllAndOverride<
      Permission[] | undefined
    >(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);

    // No @RequirePermissions() on this route — JWT is enough
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    // ── Resolve user from request (populated by JwtAuthGuard) ─────────────────
    const request = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();

    const user = request.user;

    if (!user) {
      // Should not reach here if JwtAuthGuard ran first, but guard against it
      throw new ForbiddenException('Accès refusé. Authentification requise.');
    }

    // ── Check permissions ──────────────────────────────────────────────────────
    const userPermissions: Permission[] =
      ROLE_PERMISSIONS[user.role as Role] ?? [];

    const hasAllPermissions = requiredPermissions.every((permission) =>
      userPermissions.includes(permission),
    );

    if (!hasAllPermissions) {
      throw new ForbiddenException(
        'Accès refusé. Vous ne disposez pas des droits nécessaires pour effectuer cette action.',
      );
    }

    return true;
  }
}
