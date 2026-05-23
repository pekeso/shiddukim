import { IsString, IsOptional, MaxLength, MinLength } from 'class-validator';

/**
 * DTO for PATCH /communities/:id — updates a community.
 *
 * All fields are optional — only provided fields are updated.
 * All validation messages are in French.
 */
export class UpdateCommunityDto {
  @IsOptional()
  @IsString({
    message: 'Le nom de la communauté doit être une chaîne de caractères.',
  })
  @MinLength(2, {
    message: 'Le nom de la communauté doit contenir au moins 2 caractères.',
  })
  @MaxLength(150, {
    message: 'Le nom de la communauté ne doit pas dépasser 150 caractères.',
  })
  name?: string;

  @IsOptional()
  @IsString({ message: 'La description doit être une chaîne de caractères.' })
  @MaxLength(1000, {
    message: 'La description ne doit pas dépasser 1000 caractères.',
  })
  description?: string;

  @IsOptional()
  @IsString({
    message: 'Le code fidèle du président doit être une chaîne de caractères.',
  })
  presidentMemberCode?: string;
}
