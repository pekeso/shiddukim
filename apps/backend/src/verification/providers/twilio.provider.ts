import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import twilio from 'twilio';
import type {
  IVerificationProvider,
  StartVerificationResult,
  VerifyCodeResult,
} from '../interfaces/verification-provider.interface.js';
import {
  VerificationChannel,
  type VerificationChannelType,
  type VerificationPurposeType,
} from '../enums/index.js';

// ─── Twilio channel mapping ───────────────────────────────────────────────────

/**
 * Maps our internal VerificationChannel to the string Twilio Verify expects.
 * See: https://www.twilio.com/docs/verify/api/verification
 */
const TWILIO_CHANNEL: Record<VerificationChannelType, string> = {
  [VerificationChannel.EMAIL]: 'email',
  [VerificationChannel.SMS]: 'sms',
  [VerificationChannel.WHATSAPP]: 'whatsapp',
};

// ─── Generic error message (French) ──────────────────────────────────────────

const PROVIDER_ERROR =
  'Le service de vérification est temporairement indisponible. Veuillez réessayer.';

// ──────────────────────────────────────────────────────────────────────────────

/**
 * TwilioVerificationProvider — sends and verifies OTP codes via Twilio Verify.
 *
 * Security rules enforced here:
 * - Raw OTP codes are NEVER received, stored, or logged. Twilio manages them.
 * - Twilio errors are caught and replaced with a generic French message.
 * - Twilio internal error details are logged at ERROR level (server-side only).
 * - The Twilio Verify SID is used for correlation; it contains no secrets.
 *
 * For MVP, only EMAIL channel is enabled. SMS and WhatsApp will work once
 * TWILIO_FROM_PHONE / TWILIO_WHATSAPP_FROM are configured.
 */
@Injectable()
export class TwilioVerificationProvider implements IVerificationProvider {
  private readonly logger = new Logger(TwilioVerificationProvider.name);
  private readonly client: ReturnType<typeof twilio>;
  private readonly serviceSid: string;

  constructor(private readonly config: ConfigService) {
    const accountSid = this.config.get<string>('TWILIO_ACCOUNT_SID') ?? '';
    const authToken = this.config.get<string>('TWILIO_AUTH_TOKEN') ?? '';
    this.serviceSid =
      this.config.get<string>('TWILIO_VERIFY_SERVICE_SID') ?? '';

    if (!accountSid || !authToken || !this.serviceSid) {
      this.logger.warn(
        '[TwilioVerificationProvider] Variables Twilio manquantes (TWILIO_ACCOUNT_SID, ' +
          'TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SERVICE_SID). ' +
          "startVerification et verifyCode échoueront jusqu'à leur configuration.",
      );
    }

    this.client = twilio(accountSid, authToken);
  }

  // ── startVerification ──────────────────────────────────────────────────────

  /**
   * Calls Twilio Verify to send a verification code to the recipient.
   *
   * Returns the Twilio Verification SID for database correlation.
   * Never returns or logs OTP codes — Twilio handles code generation entirely.
   */
  async startVerification(
    recipient: string,
    channel: VerificationChannelType,
    _purpose: VerificationPurposeType,
  ): Promise<StartVerificationResult> {
    this.assertConfigured();

    const twilioChannel = TWILIO_CHANNEL[channel];

    try {
      const verification = await this.client.verify.v2
        .services(this.serviceSid)
        .verifications.create({ to: recipient, channel: twilioChannel });

      this.logger.log(
        `[TwilioVerificationProvider] Vérification initiée — SID: ${verification.sid}, canal: ${channel}`,
      );

      return { providerVerificationId: verification.sid };
    } catch (err: unknown) {
      this.logger.error(
        `[TwilioVerificationProvider] Échec de startVerification (canal: ${channel}): ${String(err)}`,
      );
      throw new InternalServerErrorException(PROVIDER_ERROR);
    }
  }

  // ── verifyCode ─────────────────────────────────────────────────────────────

  /**
   * Calls Twilio Verify to check the code provided by the user.
   *
   * Returns { valid: true } when Twilio confirms the code is correct.
   * Returns { valid: false } when the code is wrong or expired on Twilio's side.
   * Throws InternalServerErrorException on Twilio connectivity/config errors.
   */
  async verifyCode(
    recipient: string,
    channel: VerificationChannelType,
    code: string,
    _purpose: VerificationPurposeType,
  ): Promise<VerifyCodeResult> {
    this.assertConfigured();

    try {
      const check = await this.client.verify.v2
        .services(this.serviceSid)
        .verificationChecks.create({ to: recipient, code });

      return { valid: check.status === 'approved' };
    } catch (err: unknown) {
      // Twilio returns a 404-like error when the verification SID no longer
      // exists (already used or expired on their side). Treat as invalid code.
      const twilioCode = (err as { code?: number }).code;
      if (twilioCode === 20404) {
        return { valid: false };
      }

      this.logger.error(
        `[TwilioVerificationProvider] Échec de verifyCode (canal: ${channel}): ${String(err)}`,
      );
      throw new InternalServerErrorException(PROVIDER_ERROR);
    }
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private assertConfigured(): void {
    if (!this.serviceSid) {
      throw new InternalServerErrorException(PROVIDER_ERROR);
    }
  }
}
