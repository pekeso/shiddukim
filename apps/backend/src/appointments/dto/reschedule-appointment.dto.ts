import { IsDateString, IsOptional, IsString, MinLength } from 'class-validator';

/**
 * RescheduleAppointmentDto — body for PATCH /appointments/:appointmentCode.
 *
 * Both fields are optional so callers can update just the date or just the notes.
 * At least one must be provided — validated in the service.
 */
export class RescheduleAppointmentDto {
  @IsOptional()
  @IsDateString(
    {},
    { message: 'La nouvelle date doit être une date ISO 8601 valide.' },
  )
  scheduledAt?: string;

  @IsOptional()
  @IsString({ message: 'Les notes doivent être une chaîne de caractères.' })
  @MinLength(1, { message: 'Les notes ne peuvent pas être vides.' })
  notes?: string;
}
