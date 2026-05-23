import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

/**
 * LoginDto — validates the body of POST /auth/login.
 *
 * Validation errors are returned in French via the global ValidationPipe.
 * Invalid credentials return a generic 401 — never reveal if the email exists.
 */
export class LoginDto {
  @IsEmail({}, { message: "L'adresse email est invalide." })
  @IsNotEmpty({ message: "L'adresse email est requise." })
  email: string;

  @IsString({ message: 'Le mot de passe doit être une chaîne de caractères.' })
  @IsNotEmpty({ message: 'Le mot de passe est requis.' })
  @MinLength(8, {
    message: 'Le mot de passe doit contenir au moins 8 caractères.',
  })
  password: string;
}
