import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { AppointmentType } from '@prisma/client';

/**
 * CreateAppointmentDto — body for POST /appointments.
 *
 * `scheduledAt` must be a future ISO 8601 date — validated in the service.
 * `marriageRequestCode` is optional — links the appointment to a dossier.
 * `pastorId` is optional — can be assigned later.
 */
export class CreateAppointmentDto {
  @IsEnum(AppointmentType, {
    message:
      'Le type de rendez-vous est invalide. Valeurs acceptées : PASTORAL_COUNSELING, MARRIAGE_REVIEW, GENERAL.',
  })
  appointmentType!: AppointmentType;

  @IsDateString(
    {},
    { message: 'La date du rendez-vous doit être une date ISO 8601 valide.' },
  )
  scheduledAt!: string;

  @IsOptional()
  @IsString({ message: 'Les notes doivent être une chaîne de caractères.' })
  @MinLength(1, { message: 'Les notes ne peuvent pas être vides.' })
  notes?: string;

  /**
   * Public code of the marriage request to link (optional).
   * The service resolves this to the internal marriageRequestId.
   */
  @IsOptional()
  @IsString({ message: 'Le code du dossier matrimonial doit être une chaîne.' })
  marriageRequestCode?: string;

  /**
   * User ID of the assigned pastor (optional).
   * Must be a User with role PASTOR — validated in the service.
   */
  @IsOptional()
  @IsString({ message: "L'identifiant du pasteur doit être une chaîne." })
  pastorId?: string;
}
