import { IsString, MinLength } from 'class-validator';

/**
 * CancelAppointmentDto — body for POST /appointments/:appointmentCode/cancel.
 *
 * A reason is required — stored in Appointment.cancelReason for the record.
 */
export class CancelAppointmentDto {
  @IsString({
    message: "La raison de l'annulation doit être une chaîne de caractères.",
  })
  @MinLength(5, {
    message: "La raison de l'annulation doit comporter au moins 5 caractères.",
  })
  reason!: string;
}
