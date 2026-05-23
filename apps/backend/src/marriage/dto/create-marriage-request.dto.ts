import {
  IsString,
  IsOptional,
  IsEmail,
  IsDateString,
  MaxLength,
} from 'class-validator';

/**
 * CreateMarriageRequestDto — body for POST /marriage-requests.
 *
 * All fields are optional at creation (saved as DRAFT).
 * Required fields are validated at submission time (POST /:requestCode/submit).
 *
 * memberId is NOT accepted from the client — it is prefilled from the
 * authenticated user's UserMemberLink by the service.
 */
export class CreateMarriageRequestDto {
  /**
   * Full name of the spouse (prénom + nom).
   * Optional at creation; required before submission.
   */
  @IsOptional()
  @IsString({
    message:
      'Le nom complet du/de la conjoint(e) doit être une chaîne de caractères.',
  })
  @MaxLength(255, {
    message:
      'Le nom complet du/de la conjoint(e) ne peut pas dépasser 255 caractères.',
  })
  spouseFullName?: string;

  /**
   * Phone number of the spouse.
   */
  @IsOptional()
  @IsString({
    message:
      'Le numéro de téléphone du/de la conjoint(e) doit être une chaîne de caractères.',
  })
  @MaxLength(30, {
    message: 'Le numéro de téléphone ne peut pas dépasser 30 caractères.',
  })
  spousePhone?: string;

  /**
   * Email address of the spouse.
   */
  @IsOptional()
  @IsEmail(
    {},
    { message: "L'adresse e-mail du/de la conjoint(e) est invalide." },
  )
  spouseEmail?: string;

  /**
   * Intended date of the marriage ceremony (ISO 8601 date string).
   */
  @IsOptional()
  @IsDateString(
    {},
    {
      message:
        'La date prévue du mariage doit être une date valide (format ISO 8601).',
    },
  )
  intendedMarriageDate?: string;
}
