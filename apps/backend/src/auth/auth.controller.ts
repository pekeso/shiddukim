import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService, TokenPair } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from './strategies/jwt.strategy';

/**
 * AuthController — handles login, logout, and token refresh.
 *
 * Base path: /api/v1/auth (set by AppModule global prefix + this controller path)
 *
 * All endpoints return French messages.
 * Login and refresh-token are public. Logout requires a valid access token.
 */
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /**
   * POST /api/v1/auth/login
   *
   * Authenticates a user with email and password.
   * Returns an access token (15 min) and a refresh token (7 days).
   *
   * Generic 401 is returned on any failure — email existence is never revealed.
   */
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
   * If a reuse attack is detected, all sessions are cleared.
   */
  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Body() dto: RefreshTokenDto): Promise<TokenPair> {
    return this.auth.refreshToken(dto);
  }

  /**
   * POST /api/v1/auth/logout
   *
   * Invalidates the current user's refresh token.
   * Requires a valid access token in the Authorization header.
   * The access token itself expires naturally within its TTL.
   */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ message: string }> {
    return this.auth.logout(user.id);
  }
}
