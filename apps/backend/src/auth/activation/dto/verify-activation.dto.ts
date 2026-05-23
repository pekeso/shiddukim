import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

/**
 * VerifyActivationDto — payload for POST /auth/activate/verify.
 *
 * The client provides:
 *   - memberCode: to identify the member
 *   - code: the OTP received by email
 *   - password: the desired account password (min 8 characters)
 */
export class VerifyActivationDto {
  @IsString({
    message: 'Le code de membre doit être une chaîne de caractères.',
  })
  @IsNotEmpty({ message: 'Le code de membre est requis.' })
  @Matches(/^SHK-\d{4}-\d{5}$/, {
    message: 'Le format du code de membre est invalide.',
  })
  memberCode!: string;

  @IsString({
    message: 'Le code de vérification doit être une chaîne de caractères.',
  })
  @IsNotEmpty({ message: 'Le code de vérification est requis.' })
  code!: string;

  @IsString({ message: 'Le mot de passe doit être une chaîne de caractères.' })
  @IsNotEmpty({ message: 'Le mot de passe est requis.' })
  @MinLength(8, {
    message: 'Le mot de passe doit comporter au moins 8 caractères.',
  })
  password!: string;
}
