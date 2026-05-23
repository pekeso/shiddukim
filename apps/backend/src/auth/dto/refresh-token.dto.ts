import { IsJWT, IsNotEmpty, IsString } from 'class-validator';

/**
 * RefreshTokenDto — validates the body of POST /auth/refresh-token.
 *
 * The refreshToken is a signed JWT generated at login.
 * It is verified server-side against the stored hash before issuing a new pair.
 */
export class RefreshTokenDto {
  @IsString({ message: 'Le token de rafraîchissement doit être une chaîne.' })
  @IsNotEmpty({ message: 'Le token de rafraîchissement est requis.' })
  @IsJWT({ message: 'Le token de rafraîchissement est invalide.' })
  refreshToken: string;
}
