/**
 * Verification domain enums — re-exported from the Prisma-generated client.
 *
 * Using the Prisma-generated types as the single source of truth ensures that
 * the TypeScript types are always in sync with the database schema.
 *
 * Import convention inside the verification module:
 *   import { VerificationChannel, OtpStatus } from '../enums';
 */
export {
  VerificationChannel,
  VerificationPurpose,
  VerificationProvider,
  OtpStatus,
} from '../../../generated/prisma/enums.js';

export type {
  VerificationChannel as VerificationChannelType,
  VerificationPurpose as VerificationPurposeType,
  VerificationProvider as VerificationProviderType,
  OtpStatus as OtpStatusType,
} from '../../../generated/prisma/enums.js';
