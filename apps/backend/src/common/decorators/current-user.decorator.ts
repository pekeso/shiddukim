import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthenticatedUser } from '../../auth/strategies/jwt.strategy';

/**
 * @CurrentUser() — extracts the authenticated user from the request.
 *
 * Requires @UseGuards(JwtAuthGuard) on the route or controller.
 *
 * Usage:
 *   async myRoute(@CurrentUser() user: AuthenticatedUser) { ... }
 *
 * The returned object contains { id, email, role } — never the raw DB record.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx
      .switchToHttp()
      .getRequest<{ user: AuthenticatedUser }>();
    return request.user;
  },
);
