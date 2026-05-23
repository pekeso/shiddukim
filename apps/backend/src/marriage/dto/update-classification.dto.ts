import { IsEnum } from 'class-validator';
import { MarriageClassification } from '@prisma/client';

/**
 * UpdateClassificationDto — body for PATCH /marriage-requests/:requestCode/classification.
 *
 * Requires marriage.classify permission (PASTOR and SUPER_ADMIN only).
 * Only allowed when status is UNDER_REVIEW or later.
 */
export class UpdateClassificationDto {
  /**
   * Pastoral classification of the marriage case.
   *   GREEN  — no obstacles; proceed normally
   *   ORANGE — minor concerns; counseling required
   *   RED    — significant obstacles; medical referral or rejection likely
   */
  @IsEnum(MarriageClassification, {
    message: `Classification invalide. Les classifications acceptées sont: ${Object.values(MarriageClassification).join(', ')}.`,
  })
  classification: MarriageClassification;
}
