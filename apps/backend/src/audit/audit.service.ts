import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { AuditActionValue } from '../common/constants/audit-actions';

/** Any JSON-serializable value (compatible with Prisma's InputJsonValue). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsonRecord = Record<string, any>;

// ─── Input shape for a single audit event ─────────────────────────────────────

export interface AuditEventInput {
  /** The user who performed the action. Null for system-initiated events. */
  actorUserId?: string | null;
  /** Action constant, e.g. AuditAction.AUTH.LOGIN ("auth.login"). */
  action: AuditActionValue | string;
  /** The type of entity affected, e.g. "User", "Member", "MarriageRequest". */
  entityType?: string | null;
  /** Stable identifier for the entity (public code or internal id). */
  entityId?: string | null;
  /** Arbitrary structured context — keep minimal to avoid leaking secrets. */
  metadata?: JsonRecord | null;
  /** Originating client IP address. */
  ipAddress?: string | null;
  /** Raw User-Agent header. */
  userAgent?: string | null;
}

// ──────────────────────────────────────────────────────────────────────────────

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Records an audit event.
   *
   * Design rules:
   *   1. **Fire-and-forget** — the write is scheduled via `setImmediate` so it
   *      does not add latency to the calling request.
   *   2. **Never throws** — any database or serialization error is caught
   *      internally and logged at ERROR level. The calling code is shielded.
   *   3. **No secrets** — callers are responsible for stripping sensitive fields
   *      from `metadata` before passing it here. This service does not sanitise.
   */
  log(event: AuditEventInput): void {
    // Schedule the write outside the current synchronous execution so the
    // response is sent to the client before the DB insert is attempted.
    setImmediate(() => {
      this.persist(event).catch((err: unknown) => {
        // Last-resort catch — should not happen because persist() catches
        // internally, but guard against unexpected rejection propagation.
        this.logger.error(
          `[AuditService] Échec inattendu de la journalisation: ${String(err)}`,
        );
      });
    });
  }

  // ── Internal ───────────────────────────────────────────────────────────────

  private async persist(event: AuditEventInput): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorUserId: event.actorUserId ?? null,
          action: event.action,
          entityType: event.entityType ?? null,
          entityId: event.entityId ?? null,
          // JSON round-trip removes `undefined` values and satisfies Prisma's
          // InputJsonValue type while keeping the metadata structure intact.
          metadata: event.metadata
            ? (JSON.parse(JSON.stringify(event.metadata)) as JsonRecord)
            : undefined,
          ipAddress: event.ipAddress ?? null,
          userAgent: event.userAgent ?? null,
        },
      });
    } catch (err: unknown) {
      // Audit logging must NEVER crash the application.
      // Log the failure and move on — a missing audit record is preferable to
      // a 500 returned to the client.
      this.logger.error(
        `[AuditService] Impossible d'enregistrer l'événement '${event.action}': ${String(err)}`,
      );
    }
  }
}
