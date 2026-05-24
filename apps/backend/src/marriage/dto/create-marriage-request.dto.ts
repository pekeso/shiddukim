import {
  IsString,
  IsOptional,
  IsBoolean,
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
 *
 * The questionnaire fields (Q3–Q11) mirror the physical
 * "Confirmation des informations pour le garçon" form used by the church.
 * All boolean questionnaire fields must be non-null before submission.
 */
export class CreateMarriageRequestDto {
  // ── Spouse information ─────────────────────────────────────────────────────

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

  /** Phone number of the spouse. */
  @IsOptional()
  @IsString({
    message:
      'Le numéro de téléphone du/de la conjoint(e) doit être une chaîne de caractères.',
  })
  @MaxLength(30, {
    message: 'Le numéro de téléphone ne peut pas dépasser 30 caractères.',
  })
  spousePhone?: string;

  /** Email address of the spouse. */
  @IsOptional()
  @IsEmail(
    {},
    { message: "L'adresse e-mail du/de la conjoint(e) est invalide." },
  )
  spouseEmail?: string;

  /** Intended date of the marriage ceremony (ISO 8601 date string). */
  @IsOptional()
  @IsDateString(
    {},
    {
      message:
        'La date prévue du mariage doit être une date valide (format ISO 8601).',
    },
  )
  intendedMarriageDate?: string;

  // ── Pastoral questionnaire ─────────────────────────────────────────────────
  // Q3 — A-t-il déjà parlé de son intention à la fiancée ?

  @IsOptional()
  @IsBoolean({
    message: 'La réponse à la question 3 doit être un booléen (vrai/faux).',
  })
  hasSpokenToSpouse?: boolean;

  // Q4 — Si oui, depuis quand ? (conditional on hasSpokenToSpouse = true)

  @IsOptional()
  @IsString({
    message: 'La réponse à la question 4 doit être une chaîne de caractères.',
  })
  @MaxLength(255, {
    message: 'La réponse à la question 4 ne peut pas dépasser 255 caractères.',
  })
  hasSpokenToSpouseSince?: string;

  // Q5 — Est-il en contact téléphonique / autres contacts avec elle ?

  @IsOptional()
  @IsBoolean({
    message: 'La réponse à la question 5 doit être un booléen (vrai/faux).',
  })
  hasContactWithSpouse?: boolean;

  // Q6 — Ses parents sont-ils au courant ?

  @IsOptional()
  @IsBoolean({
    message: 'La réponse à la question 6 doit être un booléen (vrai/faux).',
  })
  parentsAware?: boolean;

  // Q7 — Les parents de la fille sont-ils au courant ?

  @IsOptional()
  @IsBoolean({
    message: 'La réponse à la question 7 doit être un booléen (vrai/faux).',
  })
  spouseParentsAware?: boolean;

  // Q8 — Ses parents connaissent-ils la fille et sa famille ?

  @IsOptional()
  @IsBoolean({
    message: 'La réponse à la question 8 doit être un booléen (vrai/faux).',
  })
  parentsKnowSpouse?: boolean;

  // Q9 — Si oui, sont-ils d'accord ? (conditional on parentsKnowSpouse = true)

  @IsOptional()
  @IsBoolean({
    message: 'La réponse à la question 9 doit être un booléen (vrai/faux).',
  })
  parentsApprove?: boolean;

  // Q10 — Les deux familles se sont-elles déjà rencontrées ?

  @IsOptional()
  @IsBoolean({
    message: 'La réponse à la question 10 doit être un booléen (vrai/faux).',
  })
  familiesMet?: boolean;

  // Q10b — Si oui, depuis quand ? (conditional on familiesMet = true)

  @IsOptional()
  @IsString({
    message: 'La réponse à la question 10b doit être une chaîne de caractères.',
  })
  @MaxLength(255, {
    message:
      'La réponse à la question 10b ne peut pas dépasser 255 caractères.',
  })
  familiesMetSince?: string;

  // Q11a — Se sont-ils déjà embrassés ?

  @IsOptional()
  @IsBoolean({
    message: 'La réponse à la question 11a doit être un booléen (vrai/faux).',
  })
  hasKissed?: boolean;

  // Q11b — Se sont-ils touchés dans le corps ?

  @IsOptional()
  @IsBoolean({
    message: 'La réponse à la question 11b doit être un booléen (vrai/faux).',
  })
  hasPhysicalContact?: boolean;

  // Q11c — Se sont-ils connus (intimité sexuelle) ?

  @IsOptional()
  @IsBoolean({
    message: 'La réponse à la question 11c doit être un booléen (vrai/faux).',
  })
  hasBeenIntimate?: boolean;

  // Q11d — Combien de fois ? (conditional on hasBeenIntimate = true)

  @IsOptional()
  @IsString({
    message: 'La réponse à la question 11d doit être une chaîne de caractères.',
  })
  @MaxLength(255, {
    message:
      'La réponse à la question 11d ne peut pas dépasser 255 caractères.',
  })
  intimacyCount?: string;
}
