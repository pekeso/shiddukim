import {
  IsString,
  IsOptional,
  IsEmail,
  IsEnum,
  IsDateString,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { Gender } from '@prisma/client';

/**
 * DTO for POST /members — creates a new church member record.
 *
 * Validation rules:
 *   - firstName and lastName are required (the only mandatory personal fields)
 *   - baptismDate and baptizedBy are settable at creation by authorised staff
 *   - phone must be a simple string (E.164 format is not enforced in MVP)
 *   - email must be a valid email address
 *   - members cannot change baptism data after creation (enforced in update DTO)
 *
 * All validation messages are in French.
 */
export class CreateMemberDto {
  // ── Required ─────────────────────────────────────────────────────────────────

  @IsString({ message: 'Le prénom est requis.' })
  @MinLength(1, { message: 'Le prénom ne peut pas être vide.' })
  @MaxLength(100, { message: 'Le prénom ne doit pas dépasser 100 caractères.' })
  firstName!: string;

  @IsString({ message: 'Le nom de famille est requis.' })
  @MinLength(1, { message: 'Le nom de famille ne peut pas être vide.' })
  @MaxLength(100, {
    message: 'Le nom de famille ne doit pas dépasser 100 caractères.',
  })
  lastName!: string;

  // ── Personal information (optional) ──────────────────────────────────────────

  @IsOptional()
  @IsString({
    message: 'Le deuxième prénom doit être une chaîne de caractères.',
  })
  @MaxLength(100, {
    message: 'Le deuxième prénom ne doit pas dépasser 100 caractères.',
  })
  middleName?: string;

  @IsOptional()
  @IsEnum(Gender, {
    message: 'Le genre doit être MALE ou FEMALE.',
  })
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
  @MaxLength(500, {
    message: "L'adresse ne doit pas dépasser 500 caractères.",
  })
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

  // ── Community ─────────────────────────────────────────────────────────────────

  @IsOptional()
  @IsString({
    message:
      "L'identifiant de la communauté doit être une chaîne de caractères.",
  })
  communityId?: string;

  // ── Church / baptism data (set by staff at creation or via admin update) ──────

  @IsOptional()
  @IsDateString(
    {},
    { message: 'La date de baptême doit être une date ISO valide.' },
  )
  baptismDate?: string;

  @IsOptional()
  @IsString({
    message: 'Le nom du baptiseur doit être une chaîne de caractères.',
  })
  @MaxLength(200, {
    message: 'Le nom du baptiseur ne doit pas dépasser 200 caractères.',
  })
  baptizedBy?: string;
}
