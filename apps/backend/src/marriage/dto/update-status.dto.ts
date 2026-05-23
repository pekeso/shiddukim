import { IsEnum } from 'class-validator';
import { MarriageRequestStatus } from '@prisma/client';

/**
 * UpdateStatusDto — body for PATCH /marriage-requests/:requestCode/status.
 *
 * Requires marriage.review permission.
 * Transition validity is enforced by the service via ALLOWED_TRANSITIONS map.
 */
export class UpdateStatusDto {
  /**
   * The target status for this transition.
   * Invalid or non-allowed transitions are rejected with a French 400 error.
   */
  @IsEnum(MarriageRequestStatus, {
    message: `Statut invalide. Les statuts acceptés sont: ${Object.values(MarriageRequestStatus).join(', ')}.`,
  })
  status: MarriageRequestStatus;
}
