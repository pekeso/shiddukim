import { IsNotEmpty, IsString, Matches } from 'class-validator';

/**
 * RequestOtpDto — payload for POST /auth/activate/request-otp.
 *
 * The client provides their member code to trigger an OTP send.
 * The VerificationService enforces resend cooldown internally.
 */
export class RequestOtpDto {
  @IsString({
    message: 'Le code de membre doit être une chaîne de caractères.',
  })
  @IsNotEmpty({ message: 'Le code de membre est requis.' })
  @Matches(/^SHK-\d{4}-\d{5}$/, {
    message: 'Le format du code de membre est invalide.',
  })
  memberCode!: string;
}
