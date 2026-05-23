import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import type { Observable } from 'rxjs';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';

/**
 * JwtAuthGuard — protects routes that require a valid JWT access token.
 *
 * Registered as a global APP_GUARD in AppModule so every route is protected
 * by default. Opt out by decorating a route or controller with @Public().
 *
 * Execution in APP_GUARD chain:
 *   ThrottlerGuard → JwtAuthGuard (this) → PermissionsGuard
 *
 * On success: populates request.user with { id, email, role }.
 * On failure: throws a French 401 UnauthorizedException.
 *
 * Usage:
 *   // Protected by default — no decorator needed
 *   async myProtectedRoute(@CurrentUser() user: AuthenticatedUser) { ... }
 *
 *   // Opt out for public routes
 *   @Public()
 *   async myPublicRoute() { ... }
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    return super.canActivate(context);
  }

  handleRequest<TUser>(err: Error | null, user: TUser | false): TUser {
    if (err || !user) {
      throw new UnauthorizedException(
        'Accès non autorisé. Veuillez vous connecter.',
      );
    }
    return user;
  }
}
