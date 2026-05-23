import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

/**
 * DTO for POST /communities — creates a new church community (cell, choir, etc.)
 *
 * All validation messages are in French.
 */
export class CreateCommunityDto {
  @IsString({ message: 'Le nom de la communauté est requis.' })
  @MinLength(2, {
    message: 'Le nom de la communauté doit contenir au moins 2 caractères.',
  })
  @MaxLength(150, {
    message: 'Le nom de la communauté ne doit pas dépasser 150 caractères.',
  })
  name!: string;

  @IsOptional()
  @IsString({ message: 'La description doit être une chaîne de caractères.' })
  @MaxLength(1000, {
    message: 'La description ne doit pas dépasser 1000 caractères.',
  })
  description?: string;

  @IsOptional()
  @IsString({
    message:
      "L'identifiant du président doit être le code fidèle du président.",
  })
  presidentMemberCode?: string;
}
