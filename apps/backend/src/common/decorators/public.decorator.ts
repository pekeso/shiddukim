import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key used by JwtAuthGuard and PermissionsGuard to identify
 * public routes that do not require authentication.
 */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Mark a route or controller as public — JwtAuthGuard and PermissionsGuard
 * both skip authentication/authorisation for routes decorated with @Public().
 *
 * Usage:
 *   @Public()
 *   @Post('login')
 *   async login() { ... }
 *
 * @Public() can also be applied at the controller level to make every route
 * in that controller public.
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
