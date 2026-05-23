import { IsNotEmpty, IsString, Matches } from 'class-validator';

/**
 * StartActivationDto — payload for POST /auth/activate/start.
 *
 * The client provides their member code to begin the activation flow.
 * The format is validated against the SHK-YYYY-NNNNN pattern so invalid
 * codes are rejected before hitting the database.
 */
export class StartActivationDto {
  @IsString({
    message: 'Le code de membre doit être une chaîne de caractères.',
  })
  @IsNotEmpty({ message: 'Le code de membre est requis.' })
  @Matches(/^SHK-\d{4}-\d{5}$/, {
    message: 'Le format du code de membre est invalide.',
  })
  memberCode!: string;
}
