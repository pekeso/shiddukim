/**
 * Audit action constants — every string represents a trackable event.
 *
 * Naming convention: DOMAIN.EVENT (uppercase keys, dot-separated lowercase values).
 *
 * These string values are stored in the database — do NOT change them after
 * deployment without a coordinated data migration.
 *
 * Organised by domain so callers can do:
 *   import { AuditAction } from '.../audit-actions';
 *   AuditAction.AUTH.LOGIN        // → "auth.login"
 *   AuditAction.MEMBER.CREATED    // → "member.created"
 */
export const AuditAction = {
  // ── Authentication ──────────────────────────────────────────────────────────
  AUTH: {
    LOGIN: 'auth.login',
    LOGOUT: 'auth.logout',
    FAILED_LOGIN: 'auth.failed_login',
    OTP_REQUESTED: 'auth.otp_requested',
    OTP_VERIFIED: 'auth.otp_verified',
  },

  // ── Members ─────────────────────────────────────────────────────────────────
  MEMBER: {
    CREATED: 'member.created',
    UPDATED: 'member.updated',
    ACTIVATED: 'member.activated',
  },

  // ── Marriage requests ────────────────────────────────────────────────────────
  MARRIAGE: {
    SUBMITTED: 'marriage.submitted',
    REVIEWED: 'marriage.reviewed',
    CLASSIFIED: 'marriage.classified',
  },

  // ── Documents ────────────────────────────────────────────────────────────────
  DOCUMENT: {
    GENERATED: 'document.generated',
  },

  // ── Files (R2 storage) ───────────────────────────────────────────────────────
  FILE: {
    UPLOADED: 'file.uploaded',
    DOWNLOADED: 'file.downloaded',
    VIEWED: 'file.viewed',
  },

  // ── Appointments ─────────────────────────────────────────────────────────────
  APPOINTMENT: {
    CREATED: 'appointment.created',
  },

  // ── Platform / administration ────────────────────────────────────────────────
  ROLE: {
    CHANGED: 'role.changed',
  },
} as const;

// Derive a union type of every leaf action string for runtime validation
type Leaves<T> = T extends object
  ? { [K in keyof T]: Leaves<T[K]> }[keyof T]
  : T;

export type AuditActionValue = Leaves<typeof AuditAction>;
