import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { DocumentType } from '@prisma/client';

/**
 * UploadDocumentDto — body fields for POST /documents/upload.
 *
 * The actual file is received as a multipart upload (via @UploadedFile()),
 * not as part of this DTO. This DTO carries the metadata that the caller
 * must provide alongside the file.
 */
export class UploadDocumentDto {
  /**
   * The type of document being uploaded.
   * Determines where in R2 the file is stored (folder path).
   */
  @IsEnum(DocumentType, {
    message:
      'Type de document invalide. Valeurs acceptées: MEMBER_PHOTO, MEMBER_CARD, MARRIAGE_REQUEST_PDF, MEDICAL_REFERRAL_PDF, SUPPORTING_DOCUMENT.',
  })
  documentType!: DocumentType;

  /**
   * Entity type that owns this document (e.g. "Member", "MarriageRequest").
   * Used for RBAC ownership checks.
   */
  @IsString({
    message: 'Le type de propriétaire doit être une chaîne de caractères.',
  })
  @IsNotEmpty({ message: 'Le type de propriétaire est obligatoire.' })
  ownerType!: string;

  /**
   * Internal database ID of the owning entity.
   * NEVER returned to clients — used only for internal linking.
   */
  @IsString({
    message:
      "L'identifiant du propriétaire doit être une chaîne de caractères.",
  })
  @IsNotEmpty({ message: "L'identifiant du propriétaire est obligatoire." })
  ownerId!: string;

  /**
   * Optional notes to store in access log metadata (e.g. upload reason).
   */
  @IsOptional()
  @IsString({ message: 'Les notes doivent être une chaîne de caractères.' })
  notes?: string;
}
