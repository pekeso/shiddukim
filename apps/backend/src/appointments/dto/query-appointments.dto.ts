import { IsEnum, IsInt, IsOptional, IsPositive, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { AppointmentStatus } from '@prisma/client';

/**
 * QueryAppointmentsDto — query params for GET /appointments.
 *
 * Status filter + standard pagination (page / limit).
 */
export class QueryAppointmentsDto {
  @IsOptional()
  @IsEnum(AppointmentStatus, {
    message:
      'Statut invalide. Valeurs : SCHEDULED, RESCHEDULED, CANCELLED, COMPLETED.',
  })
  status?: AppointmentStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'La page doit être un entier.' })
  @IsPositive({ message: 'La page doit être un entier positif.' })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'La limite doit être un entier.' })
  @IsPositive({ message: 'La limite doit être un entier positif.' })
  @Max(100, { message: 'La limite maximale est 100.' })
  limit?: number = 20;
}
