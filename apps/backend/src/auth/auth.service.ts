import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { HashingService } from '../common/services/hashing.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../common/constants/audit-actions';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { JwtPayload } from './strategies/jwt.strategy';

// ─── Token pair returned to the client ────────────────────────────────────────

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  /** Access token expiry in seconds (informational, not enforced here). */
  expiresIn: number;
}

// ─── Refresh token JWT payload ─────────────────────────────────────────────────

interface RefreshPayload {
  sub: string;
  nonce: string;
  type: 'refresh';
}

// ─── Request context passed to audited methods ────────────────────────────────

export interface RequestContext {
  ipAddress?: string | null;
  userAgent?: string | null;
}

// ─── Duration parser ───────────────────────────────────────────────────────────

/**
 * Converts duration strings like "15m", "7d", "1h" to milliseconds.
 * Used to compute refreshTokenExpiresAt from the config string.
 */
function durationToMs(duration: string): number {
  const match = /^(\d+)(s|m|h|d)$/.exec(duration);
  if (!match) throw new Error(`Durée invalide: ${duration}`);
  const value = parseInt(match[1], 10);
  const multipliers: Record<string, number> = {
    s: 1_000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  return value * multipliers[match[2]];
}

// ─── Generic auth error ─────────────────────────────────────────────────────────

const GENERIC_AUTH_ERROR = 'Identifiants invalides. Veuillez réessayer.';

const GENERIC_TOKEN_ERROR =
  'Session expirée ou invalide. Veuillez vous reconnecter.';

// ──────────────────────────────────────────────────────────────────────────────

@Injectable()
export class AuthService {
  private readonly accessExpiresIn: string;
  private readonly refreshExpiresIn: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly hashing: HashingService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {
    this.accessExpiresIn = this.config.get<string>(
      'JWT_ACCESS_EXPIRES_IN',
      '15m',
    );
    this.refreshExpiresIn = this.config.get<string>(
      'JWT_REFRESH_EXPIRES_IN',
      '7d',
    );
  }

  // ── Login ──────────────────────────────────────────────────────────────────

  /**
   * Validates credentials and returns a token pair.
   *
   * Security notes:
   * - Generic 401 on any failure — never reveal whether the email exists.
   * - Suspended users receive the same generic error (no enumeration).
   * - lastLoginAt is updated only on success.
   * - Audit events are fire-and-forget; they never delay or crash this method.
   */
  async login(dto: LoginDto, ctx: RequestContext = {}): Promise<TokenPair> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    // Compare passwords even if user not found to prevent timing attacks
    const dummyHash =
      '$argon2id$v=19$m=65536,t=3,p=4$dummy$dummyhashfordummyusernotfound';
    const passwordHash = user?.passwordHash ?? dummyHash;
    const passwordValid = await this.hashing.compare(
      dto.password,
      passwordHash,
    );

    if (!user || !passwordValid) {
      // Fire-and-forget — failed login (email enumeration safe: no entityId)
      this.audit.log({
        actorUserId: null,
        action: AuditAction.AUTH.FAILED_LOGIN,
        entityType: 'User',
        entityId: null, // Do not reveal whether the email exists
        metadata: { email: dto.email },
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });

      throw new UnauthorizedException(GENERIC_AUTH_ERROR);
    }

    if (user.status !== 'ACTIVE') {
      // Same generic message — do not reveal account suspension status
      this.audit.log({
        actorUserId: user.id,
        action: AuditAction.AUTH.FAILED_LOGIN,
        entityType: 'User',
        entityId: user.id,
        metadata: { reason: 'account_not_active' },
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      });

      throw new UnauthorizedException(GENERIC_AUTH_ERROR);
    }

    const tokens = await this.generateAndStoreTokens(
      user.id,
      user.email,
      user.role,
    );

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Fire-and-forget — successful login
    this.audit.log({
      actorUserId: user.id,
      action: AuditAction.AUTH.LOGIN,
      entityType: 'User',
      entityId: user.id,
      metadata: null,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return tokens;
  }

  // ── Refresh token ──────────────────────────────────────────────────────────

  /**
   * Validates the refresh token, issues a new token pair, and invalidates the old one.
   *
   * Refresh tokens are JWT-signed. The nonce embedded in the JWT is hashed and
   * stored in the DB — this allows server-side revocation on logout.
   */
  async refreshToken(dto: RefreshTokenDto): Promise<TokenPair> {
    let payload: RefreshPayload;

    try {
      payload = await this.jwt.verifyAsync<RefreshPayload>(dto.refreshToken, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException(GENERIC_TOKEN_ERROR);
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException(GENERIC_TOKEN_ERROR);
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException(GENERIC_TOKEN_ERROR);
    }

    // Verify the stored hash exists and the nonce matches
    if (!user.refreshTokenHash || !user.refreshTokenExpiresAt) {
      throw new UnauthorizedException(GENERIC_TOKEN_ERROR);
    }

    if (user.refreshTokenExpiresAt < new Date()) {
      throw new UnauthorizedException(GENERIC_TOKEN_ERROR);
    }

    const nonceValid = await this.hashing.compare(
      payload.nonce,
      user.refreshTokenHash,
    );

    if (!nonceValid) {
      // Possible token reuse attack — invalidate all sessions for this user
      await this.prisma.user.update({
        where: { id: user.id },
        data: { refreshTokenHash: null, refreshTokenExpiresAt: null },
      });
      throw new ForbiddenException(GENERIC_TOKEN_ERROR);
    }

    return this.generateAndStoreTokens(user.id, user.email, user.role);
  }

  // ── Logout ─────────────────────────────────────────────────────────────────

  /**
   * Clears the stored refresh token — effectively ending all active sessions
   * that relied on it. The access token will expire naturally within its TTL.
   */
  async logout(
    userId: string,
    ctx: RequestContext = {},
  ): Promise<{ message: string }> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null, refreshTokenExpiresAt: null },
    });

    // Fire-and-forget — logout event
    this.audit.log({
      actorUserId: userId,
      action: AuditAction.AUTH.LOGOUT,
      entityType: 'User',
      entityId: userId,
      metadata: null,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return { message: 'Déconnexion réussie.' };
  }

  // ── Token generation ────────────────────────────────────────────────────────

  /**
   * Generates an access + refresh token pair, hashes the refresh nonce, and
   * persists the hash (+ expiry) to the DB in a single update.
   */
  private async generateAndStoreTokens(
    userId: string,
    email: string,
    role: string,
  ): Promise<TokenPair> {
    // Access token
    const accessPayload: JwtPayload = {
      sub: userId,
      email,
      role,
      type: 'access',
    };

    const accessExpiresInSeconds = Math.floor(
      durationToMs(this.accessExpiresIn) / 1000,
    );

    const accessToken = await this.jwt.signAsync(accessPayload, {
      secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: accessExpiresInSeconds,
    });

    // Refresh token — embed a random nonce that is hashed and stored in DB
    const { randomBytes } = await import('crypto');
    const nonce = randomBytes(32).toString('hex');

    const refreshPayload: RefreshPayload = {
      sub: userId,
      nonce,
      type: 'refresh',
    };

    const refreshExpiresInSeconds = Math.floor(
      durationToMs(this.refreshExpiresIn) / 1000,
    );

    const refreshToken = await this.jwt.signAsync(refreshPayload, {
      secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: refreshExpiresInSeconds,
    });

    // Hash the nonce (not the full JWT) for efficient, secure storage
    const nonceHash = await this.hashing.hash(nonce);
    const refreshExpiresAt = new Date(
      Date.now() + refreshExpiresInSeconds * 1000,
    );

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        refreshTokenHash: nonceHash,
        refreshTokenExpiresAt: refreshExpiresAt,
      },
    });

    // Parse access expiry in seconds for the client's convenience
    const accessExpiresInMs = durationToMs(this.accessExpiresIn);

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: Math.floor(accessExpiresInMs / 1000),
    };
  }
}
