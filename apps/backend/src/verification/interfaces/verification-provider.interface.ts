import type {
  VerificationChannelType,
  VerificationPurposeType,
} from '../enums/index.js';

// ─── Result types ─────────────────────────────────────────────────────────────

/**
 * Returned by a provider's startVerification call.
 * providerVerificationId is provider-specific (e.g. Twilio Verification SID).
 */
export interface StartVerificationResult {
  /** Provider-specific verification identifier for correlation. Never contains OTP codes. */
  providerVerificationId?: string;
}

/**
 * Returned by a provider's verifyCode call.
 * valid: true only when the provider confirmed the code is correct and not expired.
 */
export interface VerifyCodeResult {
  valid: boolean;
}

// ─── Provider contract ────────────────────────────────────────────────────────

/**
 * IVerificationProvider — the contract that any verification backend must satisfy.
 *
 * Design rules:
 * - Implementations MUST NOT store raw OTP codes.
 * - Implementations MUST NOT forward raw provider errors to callers.
 * - Implementations MUST handle their own provider errors and throw
 *   NestJS HTTP exceptions with French messages (or re-throw as-is for the
 *   VerificationService to handle).
 *
 * Current implementations: TwilioVerificationProvider
 * Planned:                 SmsTwilioProvider, WhatsAppTwilioProvider
 */
export interface IVerificationProvider {
  /**
   * Initiates a verification and returns the provider's correlation ID.
   * @param recipient  Email address or phone number to send the code to.
   * @param channel    Delivery channel (EMAIL, SMS, WHATSAPP).
   * @param purpose    Business reason for the verification.
   */
  startVerification(
    recipient: string,
    channel: VerificationChannelType,
    purpose: VerificationPurposeType,
  ): Promise<StartVerificationResult>;

  /**
   * Checks whether the code supplied by the user is correct.
   * @param recipient  Same recipient used in startVerification.
   * @param channel    Same channel used in startVerification.
   * @param code       The code provided by the end user.
   * @param purpose    Same purpose used in startVerification.
   */
  verifyCode(
    recipient: string,
    channel: VerificationChannelType,
    code: string,
    purpose: VerificationPurposeType,
  ): Promise<VerifyCodeResult>;
}

/** DI injection token so the provider can be swapped without changing VerificationService. */
export const VERIFICATION_PROVIDER = Symbol('VERIFICATION_PROVIDER');
