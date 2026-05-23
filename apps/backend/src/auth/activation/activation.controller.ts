import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { ActivationService } from './activation.service';
import {
  type ActivationStartResponse,
  type RequestOtpResponse,
  type ActivationVerifyResponse,
} from './activation.service';
import { StartActivationDto } from './dto/start-activation.dto';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyActivationDto } from './dto/verify-activation.dto';
import { Public } from '../../common/decorators/public.decorator';

/**
 * ActivationController — handles the three-step member account activation flow.
 *
 * All routes are public (@Public) — no JWT is required because the member has
 * not yet created a user account.
 *
 * All three routes are rate-limited (10 req / 60 s) to prevent enumeration
 * and brute-force attacks. This is stricter than the global default (60/60 s)
 * and comparable to the login endpoint (5/60 s, slightly looser here because
 * the flow requires three sequential calls to complete).
 *
 * Base path: /api/v1/auth/activate  (registered under AuthController's 'auth')
 */
@Public()
@Controller('auth/activate')
export class ActivationController {
  constructor(private readonly activation: ActivationService) {}

  /**
   * POST /api/v1/auth/activate/start
   *
   * Step 1: member enters their member code.
   * Returns a masked email (e.g. j***@gmail.com) to confirm identity.
   *
   * Generic 400 on any ineligibility — never reveals whether a code exists.
   */
  @Throttle({ default: { limit: 10, ttl: 60 } })
  @Post('start')
  @HttpCode(HttpStatus.OK)
  async start(
    @Body() dto: StartActivationDto,
    @Req() req: Request,
  ): Promise<ActivationStartResponse> {
    return this.activation.start(dto.memberCode, {
      ipAddress: extractIp(req),
      userAgent: req.headers['user-agent'] ?? null,
    });
  }

  /**
   * POST /api/v1/auth/activate/request-otp
   *
   * Step 2: sends an OTP to the member's email address.
   * VerificationService enforces resend cooldown and returns a 429 if the
   * cooldown period has not elapsed since the last request.
   */
  @Throttle({ default: { limit: 10, ttl: 60 } })
  @Post('request-otp')
  @HttpCode(HttpStatus.OK)
  async requestOtp(
    @Body() dto: RequestOtpDto,
    @Req() req: Request,
  ): Promise<RequestOtpResponse> {
    return this.activation.requestOtp(dto.memberCode, {
      ipAddress: extractIp(req),
      userAgent: req.headers['user-agent'] ?? null,
    });
  }

  /**
   * POST /api/v1/auth/activate/verify
   *
   * Step 3: verifies the OTP, creates the user account, links it to the member
   * profile, and returns a token pair so the user is immediately logged in.
   *
   * On success the response contains accessToken + refreshToken (same shape as
   * POST /auth/login) plus a French success message.
   */
  @Throttle({ default: { limit: 10, ttl: 60 } })
  @Post('verify')
  @HttpCode(HttpStatus.CREATED)
  async verify(
    @Body() dto: VerifyActivationDto,
    @Req() req: Request,
  ): Promise<ActivationVerifyResponse> {
    return this.activation.verify(dto.memberCode, dto.code, dto.password, {
      ipAddress: extractIp(req),
      userAgent: req.headers['user-agent'] ?? null,
    });
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Extracts the originating client IP from the request.
 * Mirrors the helper in auth.controller.ts.
 */
function extractIp(req: Request): string | null {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const first = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    const ip = first.split(',')[0].trim();
    if (ip) return ip;
  }
  return req.socket?.remoteAddress ?? null;
}
