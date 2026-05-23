import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { AuditAction } from '../common/constants/audit-actions.js';
import type { RequestContext } from '../auth/auth.service.js';
import {
  OtpStatus,
  VerificationChannel,
  VerificationProvider,
  type VerificationChannelType,
  type VerificationPurposeType,
} from './enums/index.js';
import {
  VERIFICATION_PROVIDER,
  type IVerificationProvider,
} from './interfaces/verification-provider.interface.js';

// ─── French user-facing messages ─────────────────────────────────────────────
// Source: docs/12-twilio-otp-design.md

const MSG_SENT = 'Un code de vérification vous a été envoyé par email.';
const MSG_INVALID = 'Le code de vérification est invalide ou expiré.';
const MSG_TOO_MANY = 'Trop de tentatives. Veuillez réessayer plus tard.';

// ──────────────────────────────────────────────────────────────────────────────

/**
 * VerificationService — domain service for OTP-based identity verification.
 *
 * Responsibilities:
 *   - Enforce resend cooldown: reject startVerification if a PENDING record
 *     exists and was created within OTP_RESEND_COOLDOWN_SECONDS.
 *   - Track attempts: reject verifyCode when attempts >= OTP_MAX_ATTEMPTS.
 *   - Expire records: mark PENDING records EXPIRED when expiresAt has passed.
 *   - Delegate code sending / checking to the injected IVerificationProvider.
 *   - Fire-and-forget audit events for OTP_REQUESTED and OTP_VERIFIED.
 *
 * Security rules:
 *   - OTP codes are NEVER passed to or stored in this service.
 *   - Metadata logged to audit is stripped of PII beyond targetType.
 *   - All user-facing errors use the generic French messages above.
 *   - Provider errors bubble up as InternalServerErrorException (from the
 *     provider) without leaking Twilio internals.
 */
@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
    @Inject(VERIFICATION_PROVIDER)
    private readonly provider: IVerificationProvider,
  ) {}

  // ── startVerification ──────────────────────────────────────────────────────

  /**
   * Sends a verification code to the recipient via the requested channel.
   *
   * Flow:
   *   1. Reject if a PENDING record exists and cooldown has not elapsed.
   *   2. Invalidate any previous PENDING records (mark FAILED).
   *   3. Delegate to the provider to send the code.
   *   4. Persist a new OtpVerification record.
   *   5. Audit AUTH.OTP_REQUESTED.
   *
   * @returns A French confirmation message.
   * @throws HttpException 429 if resend cooldown is active.
   * @throws InternalServerErrorException if the provider fails.
   */
  async startVerification(
    recipient: string,
    channel: VerificationChannelType,
    purpose: VerificationPurposeType,
    ctx: RequestContext = {},
  ): Promise<{ message: string }> {
    const cooldownSeconds = this.config.get<number>(
      'OTP_RESEND_COOLDOWN_SECONDS',
      60,
    );
    const cooldownCutoff = new Date(Date.now() - cooldownSeconds * 1000);

    // ── 1. Cooldown check ──────────────────────────────────────────────────
    const recentPending = await this.prisma.otpVerification.findFirst({
      where: {
        targetValue: recipient,
        channel,
        purpose,
        status: OtpStatus.PENDING,
        createdAt: { gte: cooldownCutoff },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (recentPending) {
      this.logger.warn(
        `[VerificationService] Délai de renvoi actif pour ${channel} / ${purpose}`,
      );
      throw new HttpException(MSG_TOO_MANY, HttpStatus.TOO_MANY_REQUESTS);
    }

    // ── 2. Invalidate stale PENDING records ────────────────────────────────
    await this.prisma.otpVerification.updateMany({
      where: {
        targetValue: recipient,
        channel,
        purpose,
        status: OtpStatus.PENDING,
      },
      data: { status: OtpStatus.FAILED },
    });

    // ── 3. Call the provider (Twilio) ──────────────────────────────────────
    const providerResult = await this.provider.startVerification(
      recipient,
      channel,
      purpose,
    );

    // ── 4. Persist OtpVerification record ──────────────────────────────────
    const expiresInMinutes = this.config.get<number>(
      'OTP_EXPIRES_IN_MINUTES',
      10,
    );
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60_000);

    const record = await this.prisma.otpVerification.create({
      data: {
        targetType: this.toTargetType(channel),
        targetValue: recipient,
        provider: VerificationProvider.TWILIO,
        providerVerificationId: providerResult.providerVerificationId ?? null,
        channel,
        purpose,
        status: OtpStatus.PENDING,
        attempts: 0,
        expiresAt,
      },
    });

    // ── 5. Audit (fire-and-forget) ─────────────────────────────────────────
    // targetValue is intentionally excluded from audit metadata to avoid
    // logging PII (email / phone number) in the audit trail.
    this.audit.log({
      actorUserId: null,
      action: AuditAction.AUTH.OTP_REQUESTED,
      entityType: 'OtpVerification',
      entityId: record.id,
      metadata: {
        channel,
        purpose,
        targetType: record.targetType,
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    // Return a channel-aware message (SMS/WhatsApp will differ in future)
    return { message: this.sentMessage(channel) };
  }

  // ── verifyCode ─────────────────────────────────────────────────────────────

  /**
   * Verifies the code supplied by the user against the provider.
   *
   * Flow:
   *   1. Find the most recent PENDING record for recipient + channel + purpose.
   *   2. Reject if not found (no active verification).
   *   3. Mark EXPIRED and reject if expiresAt has passed.
   *   4. Reject if attempts have reached OTP_MAX_ATTEMPTS.
   *   5. Delegate to the provider's verifyCode.
   *   6. On failure: increment attempts and throw 400.
   *   7. On success: mark VERIFIED, audit AUTH.OTP_VERIFIED.
   *
   * @returns The id of the verified OtpVerification record (for callers to link).
   * @throws BadRequestException (400) for invalid/expired code.
   * @throws HttpException 429 for too many attempts.
   * @throws InternalServerErrorException if the provider fails.
   */
  async verifyCode(
    recipient: string,
    channel: VerificationChannelType,
    code: string,
    purpose: VerificationPurposeType,
    ctx: RequestContext = {},
  ): Promise<{ verificationId: string }> {
    const maxAttempts = this.config.get<number>('OTP_MAX_ATTEMPTS', 5);

    // ── 1. Find active PENDING record ──────────────────────────────────────
    const record = await this.prisma.otpVerification.findFirst({
      where: {
        targetValue: recipient,
        channel,
        purpose,
        status: OtpStatus.PENDING,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) {
      throw new BadRequestException(MSG_INVALID);
    }

    // ── 2. Expiry check ────────────────────────────────────────────────────
    if (record.expiresAt < new Date()) {
      // Transition to EXPIRED so future queries don't pick it up
      await this.prisma.otpVerification.update({
        where: { id: record.id },
        data: { status: OtpStatus.EXPIRED },
      });
      throw new BadRequestException(MSG_INVALID);
    }

    // ── 3. Attempt limit ───────────────────────────────────────────────────
    if (record.attempts >= maxAttempts) {
      throw new HttpException(MSG_TOO_MANY, HttpStatus.TOO_MANY_REQUESTS);
    }

    // ── 4. Call the provider ───────────────────────────────────────────────
    const result = await this.provider.verifyCode(
      recipient,
      channel,
      code,
      purpose,
    );

    // ── 5a. Code is wrong — increment attempts ─────────────────────────────
    if (!result.valid) {
      await this.prisma.otpVerification.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException(MSG_INVALID);
    }

    // ── 5b. Code is correct — mark VERIFIED ───────────────────────────────
    await this.prisma.otpVerification.update({
      where: { id: record.id },
      data: {
        status: OtpStatus.VERIFIED,
        verifiedAt: new Date(),
      },
    });

    // ── 6. Audit (fire-and-forget) ─────────────────────────────────────────
    this.audit.log({
      actorUserId: null,
      action: AuditAction.AUTH.OTP_VERIFIED,
      entityType: 'OtpVerification',
      entityId: record.id,
      metadata: { channel, purpose, targetType: record.targetType },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return { verificationId: record.id };
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /**
   * Maps a VerificationChannel to the targetType string stored in the DB.
   * targetType describes the contact point type without embedding PII.
   */
  private toTargetType(channel: VerificationChannelType): string {
    switch (channel) {
      case VerificationChannel.EMAIL:
        return 'email';
      case VerificationChannel.SMS:
        return 'phone';
      case VerificationChannel.WHATSAPP:
        return 'whatsapp';
      default:
        return 'unknown';
    }
  }

  /**
   * Returns the appropriate French sent-message for the channel.
   * SMS/WhatsApp messages will differ from email in future phases.
   */
  private sentMessage(channel: VerificationChannelType): string {
    // All enabled channels in MVP use email, but the message is channel-aware
    // to support future SMS ("…par SMS") and WhatsApp ("…par WhatsApp").
    switch (channel) {
      case VerificationChannel.SMS:
        return 'Un code de vérification vous a été envoyé par SMS.';
      case VerificationChannel.WHATSAPP:
        return 'Un code de vérification vous a été envoyé par WhatsApp.';
      case VerificationChannel.EMAIL:
      default:
        return MSG_SENT;
    }
  }
}
