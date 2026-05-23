import { IsEnum, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { MarriageRequestStatus } from '@prisma/client';

/**
 * QueryMarriageRequestsDto — query parameters for GET /marriage-requests.
 *
 * PASTOR and above: list all requests, optionally filtered by status.
 * MEMBER: only sees their own requests (scoping is enforced in the service).
 */
export class QueryMarriageRequestsDto {
  /**
   * Filter by workflow status.
   */
  @IsOptional()
  @IsEnum(MarriageRequestStatus, {
    message: `Statut invalide. Les statuts acceptés sont: ${Object.values(MarriageRequestStatus).join(', ')}.`,
  })
  status?: MarriageRequestStatus;

  /**
   * Page number (1-based). Defaults to 1.
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Le numéro de page doit être un entier.' })
  @Min(1, { message: 'Le numéro de page doit être au moins 1.' })
  page?: number;

  /**
   * Number of results per page. Defaults to 20, maximum 100.
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'La limite doit être un entier.' })
  @Min(1, { message: 'La limite doit être au moins 1.' })
  @Max(100, { message: 'La limite ne peut pas dépasser 100.' })
  limit?: number;
}
