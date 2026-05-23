import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { VerificationService } from './verification.service.js';
import { TwilioVerificationProvider } from './providers/twilio.provider.js';
import { VERIFICATION_PROVIDER } from './interfaces/verification-provider.interface.js';

/**
 * VerificationModule — OTP-based identity verification.
 *
 * Provides:
 *   - VerificationService: domain logic (cooldown, attempt tracking, audit)
 *   - TwilioVerificationProvider: bound to VERIFICATION_PROVIDER token
 *
 * Exports VerificationService so that Phase 9 (Member Activation) and any
 * future phase can inject it without re-declaring these providers.
 *
 * Swapping the provider (e.g. for tests or a different SMS gateway) requires
 * only changing the useClass on the VERIFICATION_PROVIDER binding here.
 */
@Module({
  imports: [ConfigModule, PrismaModule, AuditModule],
  providers: [
    // Bind the IVerificationProvider token to the Twilio implementation.
    // Future: swap useClass to a mock or alternative provider.
    {
      provide: VERIFICATION_PROVIDER,
      useClass: TwilioVerificationProvider,
    },
    VerificationService,
  ],
  exports: [VerificationService],
})
export class VerificationModule {}
