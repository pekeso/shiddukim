import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * JwtAuthGuard — protects routes that require a valid JWT access token.
 *
 * Usage:
 *   @UseGuards(JwtAuthGuard)
 *   async myProtectedRoute(@CurrentUser() user: AuthenticatedUser) { ... }
 *
 * Returns a French 401 message when the token is missing or invalid.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser>(err: Error | null, user: TUser | false): TUser {
    if (err || !user) {
      throw new UnauthorizedException(
        'Accès non autorisé. Veuillez vous connecter.',
      );
    }
    return user;
  }
}
