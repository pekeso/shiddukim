/**
 * Permission constants — every string is a capability that can be required
 * on an endpoint via @RequirePermissions().
 *
 * Naming convention: <domain>.<action>
 *
 * These strings are compared at runtime — do not change their values once
 * deployed without a coordinated migration.
 */
export const Permission = {
  // ── Members ──────────────────────────────────────────────────────────────────
  MEMBER_CREATE: 'member.create',
  MEMBER_READ: 'member.read',
  MEMBER_UPDATE: 'member.update',
  MEMBER_DELETE: 'member.delete',

  // ── Communities ───────────────────────────────────────────────────────────────
  COMMUNITY_CREATE: 'community.create',
  COMMUNITY_UPDATE: 'community.update',

  // ── Marriage requests ─────────────────────────────────────────────────────────
  MARRIAGE_CREATE: 'marriage.create',
  MARRIAGE_REVIEW: 'marriage.review',
  MARRIAGE_CLASSIFY: 'marriage.classify',

  // ── Appointments ──────────────────────────────────────────────────────────────
  APPOINTMENT_CREATE: 'appointment.create',
  APPOINTMENT_MANAGE: 'appointment.manage',

  // ── Documents ─────────────────────────────────────────────────────────────────
  DOCUMENT_GENERATE: 'document.generate',
  DOCUMENT_VIEW: 'document.view',

  // ── Platform ──────────────────────────────────────────────────────────────────
  DASHBOARD_VIEW: 'dashboard.view',
  AUDIT_VIEW: 'audit.view',
} as const;

export type Permission = (typeof Permission)[keyof typeof Permission];
