import { Module } from '@nestjs/common';
import { MarriageService } from './marriage.service';
import { MarriageController } from './marriage.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';

/**
 * MarriageModule — manages the marriage request workflow.
 *
 * Endpoints exposed:
 *   POST   /marriage-requests                          — create DRAFT
 *   POST   /marriage-requests/:requestCode/submit      — DRAFT → SUBMITTED
 *   GET    /marriage-requests                          — list (scoped by role)
 *   GET    /marriage-requests/:requestCode             — get detail
 *   PATCH  /marriage-requests/:requestCode             — update pastoral notes
 *   PATCH  /marriage-requests/:requestCode/status      — change workflow status
 *   PATCH  /marriage-requests/:requestCode/classification — set GREEN/ORANGE/RED
 *
 * Imports:
 *   PrismaModule — database access (global, re-imported for explicitness)
 *   AuditModule  — MARRIAGE.SUBMITTED, MARRIAGE.REVIEWED, MARRIAGE.CLASSIFIED events
 */
@Module({
  imports: [PrismaModule, AuditModule],
  providers: [MarriageService],
  controllers: [MarriageController],
  exports: [MarriageService],
})
export class MarriageModule {}
