export type Role =
  | 'SUPER_ADMIN'
  | 'CHURCH_ADMIN'
  | 'SECRETARY'
  | 'PASTOR'
  | 'COMMUNITY_LEADER'
  | 'MEMBER';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType?: 'Bearer';
  expiresIn?: number;
}

export interface AuthUser {
  email: string;
  role: Role;
}

export interface LoginResponse extends AuthTokens {
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export type MemberStatus = 'CREATED' | 'ACTIVATED' | 'SUSPENDED' | 'DECEASED';
export type Gender = 'MALE' | 'FEMALE';

export interface MemberSummary {
  memberCode: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  gender?: Gender | null;
  status: MemberStatus;
  communityId?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface MemberDetail extends MemberSummary {
  dateOfBirth?: string | null;
  placeOfBirth?: string | null;
  address?: string | null;
  baptismDate?: string | null;
  baptizedBy?: string | null;
}

export interface DuplicateWarning {
  field: 'name+dateOfBirth' | 'phone' | 'email';
  memberCode: string;
  message: string;
}

export interface CreateMemberResponse {
  member: MemberDetail;
  duplicateWarnings: DuplicateWarning[];
}

export interface Community {
  id: string;
  name: string;
  description?: string | null;
  presidentMemberCode?: string | null;
  memberCount?: number;
  createdAt: string;
  updatedAt?: string;
}

export type MarriageRequestStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'WAITING_APPOINTMENT'
  | 'COUNSELING'
  | 'MEDICAL_REFERRAL'
  | 'WAITING_RESULTS'
  | 'APPROVED'
  | 'REJECTED'
  | 'COMPLETED';

export type MarriageClassification = 'GREEN' | 'ORANGE' | 'RED';

export interface MarriageRequest {
  requestCode: string;
  memberCode: string;
  spouseFullName?: string | null;
  spousePhone?: string | null;
  spouseEmail?: string | null;
  intendedMarriageDate?: string | null;
  pastorNotes?: string | null;
  status: MarriageRequestStatus;
  classification?: MarriageClassification | null;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  // Pastoral questionnaire
  hasSpokenToSpouse?: boolean | null;
  hasSpokenToSpouseSince?: string | null;
  hasContactWithSpouse?: boolean | null;
  parentsAware?: boolean | null;
  spouseParentsAware?: boolean | null;
  parentsKnowSpouse?: boolean | null;
  parentsApprove?: boolean | null;
  familiesMet?: boolean | null;
  familiesMetSince?: string | null;
  hasKissed?: boolean | null;
  hasPhysicalContact?: boolean | null;
  hasBeenIntimate?: boolean | null;
  intimacyCount?: string | null;
}

export interface GeneratedDocumentResponse {
  documentCode: string;
  signedUrl: string;
  signedUrlExpiresAt: string;
}

export type AppointmentStatus = 'SCHEDULED' | 'RESCHEDULED' | 'CANCELLED' | 'COMPLETED';
export type AppointmentType = 'PASTORAL_COUNSELING' | 'MARRIAGE_REVIEW' | 'GENERAL';

export interface Appointment {
  appointmentCode: string;
  memberCode: string;
  appointmentType: AppointmentType;
  scheduledAt: string;
  notes?: string | null;
  status: AppointmentStatus;
  cancelReason?: string | null;
  pastorId?: string | null;
  marriageRequestCode?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export type DocumentType =
  | 'MEMBER_PHOTO'
  | 'MEMBER_CARD'
  | 'MARRIAGE_REQUEST_PDF'
  | 'MEDICAL_REFERRAL_PDF'
  | 'SUPPORTING_DOCUMENT';

export interface Document {
  documentCode: string;
  ownerType: string;
  ownerId?: string;
  documentType: DocumentType;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  visibility: 'PRIVATE' | 'RESTRICTED';
  status: 'ACTIVE' | 'DELETED';
  createdAt: string;
  updatedAt: string;
}

export interface DocumentWithUrl extends Document {
  signedUrl: string;
  signedUrlExpiresAt: string;
}

export interface DashboardSummary {
  totalMembers: number;
  activeMembers: number;
  pendingRequests: number;
  greenCount: number;
  orangeCount: number;
  redCount: number;
  upcomingAppointments: number;
}

export interface MarriageStat {
  month: string;
  submitted: number;
  approved: number;
  rejected: number;
}

export interface AppointmentStat {
  month: string;
  scheduled: number;
  completed: number;
  cancelled: number;
}

export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
}
