import type {
  AppointmentStatus,
  AppointmentType,
  DocumentType,
  MarriageClassification,
  MarriageRequestStatus,
  MemberStatus,
} from './types';

export const memberStatusLabels: Record<MemberStatus, string> = {
  CREATED: 'Créé',
  ACTIVATED: 'Activé',
  SUSPENDED: 'Suspendu',
  DECEASED: 'Décédé',
};

export const marriageStatusLabels: Record<MarriageRequestStatus, string> = {
  DRAFT: 'Brouillon',
  SUBMITTED: 'Soumis',
  UNDER_REVIEW: "En cours d'examen",
  WAITING_APPOINTMENT: 'En attente de rendez-vous',
  COUNSELING: 'Counseling',
  MEDICAL_REFERRAL: 'Référence médicale',
  WAITING_RESULTS: 'En attente de résultats',
  APPROVED: 'Approuvé',
  REJECTED: 'Rejeté',
  COMPLETED: 'Complété',
};

export const nextMarriageStatuses: Record<MarriageRequestStatus, MarriageRequestStatus[]> = {
  DRAFT: ['SUBMITTED'],
  SUBMITTED: ['UNDER_REVIEW'],
  UNDER_REVIEW: ['WAITING_APPOINTMENT', 'COUNSELING', 'MEDICAL_REFERRAL', 'REJECTED'],
  WAITING_APPOINTMENT: ['COUNSELING'],
  COUNSELING: ['MEDICAL_REFERRAL', 'APPROVED', 'REJECTED'],
  MEDICAL_REFERRAL: ['WAITING_RESULTS'],
  WAITING_RESULTS: ['APPROVED', 'REJECTED'],
  APPROVED: ['COMPLETED'],
  REJECTED: [],
  COMPLETED: [],
};

export const classificationLabels: Record<MarriageClassification, string> = {
  GREEN: 'Vert',
  ORANGE: 'Orange',
  RED: 'Rouge',
};

export const appointmentStatusLabels: Record<AppointmentStatus, string> = {
  SCHEDULED: 'Planifié',
  RESCHEDULED: 'Replanifié',
  CANCELLED: 'Annulé',
  COMPLETED: 'Terminé',
};

export const appointmentTypeLabels: Record<AppointmentType, string> = {
  PASTORAL_COUNSELING: 'Accompagnement pastoral',
  MARRIAGE_REVIEW: 'Examen matrimonial',
  GENERAL: 'Général',
};

export const documentTypeLabels: Record<DocumentType, string> = {
  MEMBER_PHOTO: 'Photo de profil',
  MEMBER_CARD: 'Carte de fidèle',
  MARRIAGE_REQUEST_PDF: 'Dossier matrimonial',
  MEDICAL_REFERRAL_PDF: 'Référence médicale',
  SUPPORTING_DOCUMENT: 'Pièce justificative',
};

export function formatDate(value?: string | null): string {
  if (!value) return '-';
  return new Intl.DateTimeFormat('fr-FR').format(new Date(value));
}

export function formatDateTime(value?: string | null): string {
  if (!value) return '-';
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}
