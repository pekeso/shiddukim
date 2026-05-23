import { IsOptional, IsString } from 'class-validator';

/**
 * UpdatePastoralNotesDto — body for PATCH /marriage-requests/:requestCode.
 *
 * Allows pastors to update the pastoral notes on a marriage request.
 * Requires marriage.review permission.
 *
 * Sending null or an empty string effectively clears the notes.
 */
export class UpdatePastoralNotesDto {
  /**
   * Free-form notes written by the pastor about the case.
   * Visible to pastoral staff only (not returned to MEMBER role in future filtering).
   */
  @IsOptional()
  @IsString({
    message: 'Les notes pastorales doivent être une chaîne de caractères.',
  })
  pastorNotes?: string;
}
