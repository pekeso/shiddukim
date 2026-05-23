import { MarriageRequestStatus } from '@prisma/client';

/**
 * Allowed status transitions for MarriageRequest workflow.
 *
 * This is the single source of truth for the state machine.
 * Any backend operation that changes a request's status MUST validate
 * against this map and reject invalid transitions with a French 400 error.
 *
 * Terminal states (REJECTED, COMPLETED) have no allowed transitions.
 *
 * Transition map:
 *   DRAFT             → SUBMITTED
 *   SUBMITTED         → UNDER_REVIEW
 *   UNDER_REVIEW      → WAITING_APPOINTMENT | COUNSELING | MEDICAL_REFERRAL | REJECTED
 *   WAITING_APPOINTMENT → COUNSELING
 *   COUNSELING        → MEDICAL_REFERRAL | APPROVED | REJECTED
 *   MEDICAL_REFERRAL  → WAITING_RESULTS
 *   WAITING_RESULTS   → APPROVED | REJECTED
 *   APPROVED          → COMPLETED
 *   REJECTED          → (terminal)
 *   COMPLETED         → (terminal)
 */
export const ALLOWED_TRANSITIONS: Record<
  MarriageRequestStatus,
  MarriageRequestStatus[]
> = {
  [MarriageRequestStatus.DRAFT]: [MarriageRequestStatus.SUBMITTED],

  [MarriageRequestStatus.SUBMITTED]: [MarriageRequestStatus.UNDER_REVIEW],

  [MarriageRequestStatus.UNDER_REVIEW]: [
    MarriageRequestStatus.WAITING_APPOINTMENT,
    MarriageRequestStatus.COUNSELING,
    MarriageRequestStatus.MEDICAL_REFERRAL,
    MarriageRequestStatus.REJECTED,
  ],

  [MarriageRequestStatus.WAITING_APPOINTMENT]: [
    MarriageRequestStatus.COUNSELING,
  ],

  [MarriageRequestStatus.COUNSELING]: [
    MarriageRequestStatus.MEDICAL_REFERRAL,
    MarriageRequestStatus.APPROVED,
    MarriageRequestStatus.REJECTED,
  ],

  [MarriageRequestStatus.MEDICAL_REFERRAL]: [
    MarriageRequestStatus.WAITING_RESULTS,
  ],

  [MarriageRequestStatus.WAITING_RESULTS]: [
    MarriageRequestStatus.APPROVED,
    MarriageRequestStatus.REJECTED,
  ],

  [MarriageRequestStatus.APPROVED]: [MarriageRequestStatus.COMPLETED],

  [MarriageRequestStatus.REJECTED]: [],

  [MarriageRequestStatus.COMPLETED]: [],
};

/**
 * French labels for each status — used in error messages.
 */
export const STATUS_LABELS: Record<MarriageRequestStatus, string> = {
  [MarriageRequestStatus.DRAFT]: 'Brouillon',
  [MarriageRequestStatus.SUBMITTED]: 'Soumis',
  [MarriageRequestStatus.UNDER_REVIEW]: "En cours d'examen",
  [MarriageRequestStatus.WAITING_APPOINTMENT]: 'En attente de rendez-vous',
  [MarriageRequestStatus.COUNSELING]: 'Counseling',
  [MarriageRequestStatus.MEDICAL_REFERRAL]: 'Référence médicale',
  [MarriageRequestStatus.WAITING_RESULTS]: 'En attente de résultats',
  [MarriageRequestStatus.APPROVED]: 'Approuvé',
  [MarriageRequestStatus.REJECTED]: 'Rejeté',
  [MarriageRequestStatus.COMPLETED]: 'Complété',
};

/**
 * Set of statuses where classification is allowed.
 * Classification can only be set once a pastoral review has started
 * (UNDER_REVIEW or any later status).
 */
export const CLASSIFICATION_ALLOWED_STATUSES = new Set<MarriageRequestStatus>([
  MarriageRequestStatus.UNDER_REVIEW,
  MarriageRequestStatus.WAITING_APPOINTMENT,
  MarriageRequestStatus.COUNSELING,
  MarriageRequestStatus.MEDICAL_REFERRAL,
  MarriageRequestStatus.WAITING_RESULTS,
  MarriageRequestStatus.APPROVED,
  MarriageRequestStatus.REJECTED,
  MarriageRequestStatus.COMPLETED,
]);
