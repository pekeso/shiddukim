import {
  IsString,
  IsOptional,
  IsEmail,
  IsEnum,
  IsDateString,
  MaxLength,
  Matches,
} from 'class-validator';
import { Gender } from '@prisma/client';

/**
 * DTO for PATCH /members/:memberCode — updates basic member fields.
 *
 * Key rule from CLAUDE.md:
 *   Members (Role.MEMBER) cannot change official church information such as
 *   baptism data. This DTO intentionally omits baptismDate and baptizedBy.
 *   Those fields can only be updated by CHURCH_ADMIN or SUPER_ADMIN via the
 *   admin update endpoint (future Phase 9).
 *
 * All validation messages are in French.
 */
export class UpdateMemberDto {
  @IsOptional()
  @IsString({ message: 'Le prénom doit être une chaîne de caractères.' })
  @MaxLength(100, { message: 'Le prénom ne doit pas dépasser 100 caractères.' })
  firstName?: string;

  @IsOptional()
  @IsString({
    message: 'Le deuxième prénom doit être une chaîne de caractères.',
  })
  @MaxLength(100, {
    message: 'Le deuxième prénom ne doit pas dépasser 100 caractères.',
  })
  middleName?: string;

  @IsOptional()
  @IsString({
    message: 'Le nom de famille doit être une chaîne de caractères.',
  })
  @MaxLength(100, {
    message: 'Le nom de famille ne doit pas dépasser 100 caractères.',
  })
  lastName?: string;

  @IsOptional()
  @IsEnum(Gender, { message: 'Le genre doit être MALE ou FEMALE.' })
  gender?: Gender;

  @IsOptional()
  @IsDateString(
    {},
    { message: 'La date de naissance doit être une date ISO valide.' },
  )
  dateOfBirth?: string;

  @IsOptional()
  @IsString({
    message: 'Le lieu de naissance doit être une chaîne de caractères.',
  })
  @MaxLength(200, {
    message: 'Le lieu de naissance ne doit pas dépasser 200 caractères.',
  })
  placeOfBirth?: string;

  @IsOptional()
  @IsString({ message: "L'adresse doit être une chaîne de caractères." })
  @MaxLength(500, { message: "L'adresse ne doit pas dépasser 500 caractères." })
  address?: string;

  @IsOptional()
  @IsString({
    message: 'Le numéro de téléphone doit être une chaîne de caractères.',
  })
  @MaxLength(30, {
    message: 'Le numéro de téléphone ne doit pas dépasser 30 caractères.',
  })
  @Matches(/^[+\d\s\-()]{6,30}$/, {
    message: "Le numéro de téléphone n'est pas valide.",
  })
  phone?: string;

  @IsOptional()
  @IsEmail({}, { message: "L'adresse e-mail n'est pas valide." })
  @MaxLength(200, {
    message: "L'adresse e-mail ne doit pas dépasser 200 caractères.",
  })
  email?: string;

  // NOTE: baptismDate and baptizedBy are intentionally excluded.
  // Members cannot change church-official data. Only CHURCH_ADMIN / SUPER_ADMIN
  // may update those fields (handled in admin-level flows, not this endpoint).
}
