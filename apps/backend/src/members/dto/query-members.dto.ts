import { IsString, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for GET /members — list members with optional search filters and pagination.
 *
 * Query parameters:
 *   firstName    — partial, case-insensitive first name filter
 *   lastName     — partial, case-insensitive last name filter
 *   memberCode   — exact member code filter (e.g. SHK-2026-00001)
 *   communityId  — filter by community UUID
 *   page         — 1-based page number (default 1)
 *   limit        — results per page (default 20, max 100)
 *
 * All validation messages are in French.
 */
export class QueryMembersDto {
  @IsOptional()
  @IsString({ message: 'Le filtre prénom doit être une chaîne de caractères.' })
  firstName?: string;

  @IsOptional()
  @IsString({ message: 'Le filtre nom doit être une chaîne de caractères.' })
  lastName?: string;

  @IsOptional()
  @IsString({ message: 'Le code fidèle doit être une chaîne de caractères.' })
  memberCode?: string;

  @IsOptional()
  @IsString({
    message:
      "L'identifiant de la communauté doit être une chaîne de caractères.",
  })
  communityId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Le numéro de page doit être un entier.' })
  @Min(1, { message: 'Le numéro de page doit être au moins 1.' })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'La limite doit être un entier.' })
  @Min(1, { message: 'La limite doit être au moins 1.' })
  @Max(100, { message: 'La limite ne peut pas dépasser 100.' })
  limit?: number = 20;
}
