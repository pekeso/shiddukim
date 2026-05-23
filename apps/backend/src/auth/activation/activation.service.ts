import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { HashingService } from '../../common/services/hashing.service';
import { AuditService } from '../../audit/audit.service';
import { VerificationService } from '../../verification/verification.service';
import {
  AuthService,
  type TokenPair,
  type RequestContext,
} from '../auth.service';
import { AuditAction } from '../../common/constants/audit-actions';
import {
  VerificationChannel,
  VerificationPurpose,
} from '../../verification/enums/index';

// ─── French user-facing messages ─────────────────────────────────────────────

const MSG_ALREADY_ACTIVATED = 'Ce compte est déjà activé.';
const MSG_NO_EMAIL =
  "Votre dossier ne contient pas encore d'adresse email valide. Veuillez contacter le secrétariat de l'église.";
const MSG_NOT_ELIGIBLE =
  "Impossible de finaliser l'activation du compte. Veuillez vérifier les informations fournies ou contacter le secrétariat.";
const MSG_SUCCESS = 'Votre compte a été activé avec succès.';

// ──────────────────────────────────────────────────────────────────────────────

/**
 * Response shape for POST /auth/activate/start.
 * Returns a masked email to confirm identity without exposing the full address.
 */
export interface ActivationStartResponse {
  maskedEmail: string;
  message: string;
}

/**
 * Response shape for POST /auth/activate/request-otp.
 */
export interface RequestOtpResponse {
  message: string;
}

/**
 * Response shape for POST /auth/activate/verify.
 * The user is immediately logged in — tokens are returned.
 */
export interface ActivationVerifyResponse extends TokenPair {
  message: string;
}

// ──────────────────────────────────────────────────────────────────────────────

/**
 * ActivationService — orchestrates the three-step member activation flow.
 *
 * Step 1: start      — confirm member eligibility, return masked email.
 * Step 2: requestOtp — send OTP via VerificationService (email in MVP).
 * Step 3: verify     — validate OTP, create User, link to Member, return tokens.
 *
 * Security rules enforced here:
 *   - Generic errors on member-not-found (no enumeration).
 *   - Double-activation rejected at both start and verify stages.
 *   - OTP codes are never seen or stored by this service.
 *   - Audit MEMBER.ACTIVATED is fired after the DB transaction.
 */
@Injectable()
export class ActivationService {
  private readonly logger = new Logger(ActivationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly hashing: HashingService,
    private readonly audit: AuditService,
    private readonly verification: VerificationService,
    private readonly auth: AuthService,
  ) {}

  // ── Step 1: start ──────────────────────────────────────────────────────────

  /**
   * POST /auth/activate/start — { memberCode }
   *
   * Checks whether the member is eligible for activation and returns a
   * masked email so the user can confirm their identity before requesting OTP.
   *
   * Returns generic 400 for all ineligibility cases to prevent member-code
   * enumeration.
   */
  async start(
    memberCode: string,
    ctx: RequestContext = {},
  ): Promise<ActivationStartResponse> {
    const member = await this.prisma.member.findUnique({
      where: { memberCode },
    });

    // Generic error — do not reveal whether the code exists
    if (!member) {
      throw new BadRequestException(MSG_NOT_ELIGIBLE);
    }

    // Already activated
    if (member.status === 'ACTIVATED') {
      throw new BadRequestException(MSG_ALREADY_ACTIVATED);
    }

    // Statuses other than CREATED are also ineligible (SUSPENDED, DECEASED)
    if (member.status !== 'CREATED') {
      throw new BadRequestException(MSG_NOT_ELIGIBLE);
    }

    // Check for existing UserMemberLink (double activation guard)
    const existingLink = await this.prisma.userMemberLink.findFirst({
      where: { memberId: member.id },
    });
    if (existingLink) {
      throw new BadRequestException(MSG_ALREADY_ACTIVATED);
    }

    // Member must have an email address on file
    if (!member.email) {
      throw new BadRequestException(MSG_NO_EMAIL);
    }

    return {
      maskedEmail: maskEmail(member.email),
      message: `Un email de vérification sera envoyé à ${maskEmail(member.email)}.`,
    };
  }

  // ── Step 2: requestOtp ────────────────────────────────────────────────────

  /**
   * POST /auth/activate/request-otp — { memberCode }
   *
   * Resolves the member's email and delegates to VerificationService.
   * VerificationService internally enforces resend cooldown and audits the event.
   *
   * Rate limiting is applied at the controller level via @Throttle.
   */
  async requestOtp(
    memberCode: string,
    ctx: RequestContext = {},
  ): Promise<RequestOtpResponse> {
    const member = await this.prisma.member.findUnique({
      where: { memberCode },
    });

    if (!member) {
      throw new BadRequestException(MSG_NOT_ELIGIBLE);
    }

    if (member.status === 'ACTIVATED') {
      throw new BadRequestException(MSG_ALREADY_ACTIVATED);
    }

    if (member.status !== 'CREATED') {
      throw new BadRequestException(MSG_NOT_ELIGIBLE);
    }

    if (!member.email) {
      throw new BadRequestException(MSG_NO_EMAIL);
    }

    // Delegate entirely to VerificationService.
    // It handles cooldown, stale-record invalidation, provider call, DB persist,
    // and fires AUTH.OTP_REQUESTED audit internally.
    const result = await this.verification.startVerification(
      member.email,
      VerificationChannel.EMAIL,
      VerificationPurpose.MEMBER_ACTIVATION,
      ctx,
    );

    return { message: result.message };
  }

  // ── Step 3: verify ────────────────────────────────────────────────────────

  /**
   * POST /auth/activate/verify — { memberCode, code, password }
   *
   * Verifies the OTP code, creates the User account, links it to the Member,
   * marks the member ACTIVATED, audits the event, and returns a token pair so
   * the user is immediately logged in.
   *
   * All DB writes are performed in a transaction so that a partial failure
   * leaves no orphaned records.
   */
  async verify(
    memberCode: string,
    code: string,
    password: string,
    ctx: RequestContext = {},
  ): Promise<ActivationVerifyResponse> {
    const member = await this.prisma.member.findUnique({
      where: { memberCode },
    });

    if (!member) {
      throw new BadRequestException(MSG_NOT_ELIGIBLE);
    }

    if (member.status === 'ACTIVATED') {
      throw new BadRequestException(MSG_ALREADY_ACTIVATED);
    }

    if (member.status !== 'CREATED') {
      throw new BadRequestException(MSG_NOT_ELIGIBLE);
    }

    if (!member.email) {
      throw new BadRequestException(MSG_NO_EMAIL);
    }

    // Double-activation guard — UserMemberLink must not already exist
    const existingLink = await this.prisma.userMemberLink.findFirst({
      where: { memberId: member.id },
    });
    if (existingLink) {
      throw new BadRequestException(MSG_ALREADY_ACTIVATED);
    }

    // Verify the OTP via VerificationService (throws on failure with French message)
    // verifyCode audits AUTH.OTP_VERIFIED internally on success.
    await this.verification.verifyCode(
      member.email,
      VerificationChannel.EMAIL,
      code,
      VerificationPurpose.MEMBER_ACTIVATION,
      ctx,
    );

    // Hash the password
    const passwordHash = await this.hashing.hash(password);

    // Transaction: create User + UserMemberLink + update Member.status atomically
    const { user } = await this.prisma.client.$transaction(async (tx) => {
      // Guard against race condition: check UserMemberLink inside transaction
      const raceLink = await tx.userMemberLink.findFirst({
        where: { memberId: member.id },
      });
      if (raceLink) {
        throw new ConflictException(MSG_ALREADY_ACTIVATED);
      }

      // Create the User account
      const user = await tx.user.create({
        data: {
          email: member.email!,
          passwordHash,
          role: 'MEMBER',
          status: 'ACTIVE',
        },
      });

      // Link User to Member (verifiedAt = now)
      await tx.userMemberLink.create({
        data: {
          userId: user.id,
          memberId: member.id,
          verifiedAt: new Date(),
        },
      });

      // Promote Member status to ACTIVATED
      await tx.member.update({
        where: { id: member.id },
        data: { status: 'ACTIVATED' },
      });

      return { user };
    });

    // Audit MEMBER.ACTIVATED (fire-and-forget — outside transaction)
    this.audit.log({
      actorUserId: user.id,
      action: AuditAction.MEMBER.ACTIVATED,
      entityType: 'Member',
      entityId: member.memberCode,
      metadata: { channel: VerificationChannel.EMAIL },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    // Issue tokens — the user is immediately logged in
    const tokens = await this.auth.issueTokenPair(
      user.id,
      user.email,
      user.role,
    );

    this.logger.log(
      `[ActivationService] Membre activé: ${member.memberCode} → user ${user.id}`,
    );

    return { ...tokens, message: MSG_SUCCESS };
  }
}

// ── Private helpers ───────────────────────────────────────────────────────────

/**
 * Masks an email address for display:
 *   "joel.mbiye@gmail.com" → "j***@gmail.com"
 *   "ab@example.org"       → "a***@example.org"
 *   "a@b.com"              → "a***@b.com"
 *
 * The first character of the local part is preserved. Everything else up to
 * the @ is replaced with "***". The domain is returned in full.
 */
function maskEmail(email: string): string {
  const atIndex = email.indexOf('@');
  if (atIndex <= 0) return '***';
  const local = email.slice(0, atIndex);
  const domain = email.slice(atIndex); // includes the @
  const visibleChar = local.charAt(0);
  return `${visibleChar}***${domain}`;
}
