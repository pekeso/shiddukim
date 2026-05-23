import {
  IsOptional,
  IsString,
  IsDateString,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Query parameters for GET /api/v1/audit-logs.
 *
 * All fields are optional — omitting them returns all records (paginated).
 * Dates accept ISO-8601 strings (e.g. "2026-01-01T00:00:00Z").
 */
export class QueryAuditLogsDto {
  /** Filter by the user who performed the action. */
  @IsOptional()
  @IsString()
  actorUserId?: string;

  /** Filter by action constant, e.g. "auth.login". */
  @IsOptional()
  @IsString()
  action?: string;

  /** Filter by entity type, e.g. "User", "Member". */
  @IsOptional()
  @IsString()
  entityType?: string;

  /** Start of date range (inclusive). ISO-8601. */
  @IsOptional()
  @IsDateString()
  from?: string;

  /** End of date range (inclusive). ISO-8601. */
  @IsOptional()
  @IsDateString()
  to?: string;

  /** Page number (1-based). Defaults to 1. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  /** Number of records per page. Defaults to 20, max 100. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
