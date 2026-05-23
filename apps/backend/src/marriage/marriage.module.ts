import { Module } from '@nestjs/common';
import { MarriageService } from './marriage.service';
import { MarriageController } from './marriage.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { StorageModule } from '../storage/storage.module';
import { PdfService } from '../documents/pdf/pdf.service';

/**
 * MarriageModule — manages the marriage request workflow and PDF generation.
 *
 * Endpoints exposed:
 *   POST   /marriage-requests                                   — create DRAFT
 *   POST   /marriage-requests/:requestCode/submit               — DRAFT → SUBMITTED
 *   GET    /marriage-requests                                   — list (scoped by role)
 *   GET    /marriage-requests/:requestCode                      — get detail
 *   PATCH  /marriage-requests/:requestCode                      — update pastoral notes
 *   PATCH  /marriage-requests/:requestCode/status               — change workflow status
 *   PATCH  /marriage-requests/:requestCode/classification       — set GREEN/ORANGE/RED
 *   POST   /marriage-requests/:requestCode/generate-pdf         — generate marriage request PDF
 *   POST   /marriage-requests/:requestCode/generate-medical-referral — generate medical referral PDF
 *
 * Imports:
 *   PrismaModule  — database access (global, re-imported for explicitness)
 *   AuditModule   — MARRIAGE.SUBMITTED, MARRIAGE.REVIEWED, MARRIAGE.CLASSIFIED,
 *                   DOCUMENT.GENERATED events
 *   StorageModule — StorageService (R2 upload + signed URL generation for PDF storage)
 *
 * Providers:
 *   PdfService    — pure PDF buffer generation from structured data (no DB access)
 *   MarriageService — full domain service including PDF orchestration
 */
@Module({
  imports: [PrismaModule, AuditModule, StorageModule],
  providers: [MarriageService, PdfService],
  controllers: [MarriageController],
  exports: [MarriageService],
})
export class MarriageModule {}
