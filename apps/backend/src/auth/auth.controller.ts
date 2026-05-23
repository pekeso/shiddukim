import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService, TokenPair } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import type { AuthenticatedUser } from './strategies/jwt.strategy';

/**
 * AuthController — handles login, logout, and token refresh.
 *
 * Base path: /api/v1/auth (global prefix + this controller path)
 *
 * Public routes (no JWT required):
 *   POST /auth/login          — @Public() + strict throttle (5 req/60 s)
 *   POST /auth/refresh-token  — @Public() + stricter throttle (10 req/60 s)
 *
 * Protected routes (JWT required — enforced by global JwtAuthGuard):
 *   POST /auth/logout         — uses default throttle (60 req/60 s)
 *
 * All error messages are in French.
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /**
   * POST /api/v1/auth/login
   *
   * Authenticates a user with email + password.
   * Returns an access token (15 min) and a refresh token (7 days).
   *
   * Rate-limited to 5 requests per 60 s per IP to prevent brute-force attacks.
   * Generic 401 on any failure — email existence is never disclosed.
   */
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto): Promise<TokenPair> {
    return this.auth.login(dto);
  }

  /**
   * POST /api/v1/auth/refresh-token
   *
   * Issues a new token pair using a valid refresh token.
   * The old refresh token is invalidated immediately (rotation).
   *
   * If a reuse attack is detected, all sessions for the user are cleared.
   *
   * Rate-limited to 10 requests per 60 s to prevent token-farming attacks.
   */
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60 } })
  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Body() dto: RefreshTokenDto): Promise<TokenPair> {
    return this.auth.refreshToken(dto);
  }

  /**
   * POST /api/v1/auth/logout
   *
   * Invalidates the current user's refresh token.
   * Requires a valid access token (enforced by global JwtAuthGuard).
   * The access token itself expires naturally within its TTL.
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ message: string }> {
    return this.auth.logout(user.id);
  }
}
