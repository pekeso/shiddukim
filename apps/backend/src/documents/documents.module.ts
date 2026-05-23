import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { DocumentsService } from './documents.service.js';
import { DocumentsController } from './documents.controller.js';
import { StorageModule } from '../storage/storage.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AuditModule } from '../audit/audit.module.js';

/**
 * DocumentsModule — handles file upload metadata, access logging, and signed URLs.
 *
 * Depends on:
 *   StorageModule  — R2 client + StorageService (upload, signed URLs)
 *   PrismaModule   — Document + FileAccessLog persistence
 *   AuditModule    — FILE.UPLOADED and related audit events
 *
 * MulterModule is configured globally with memory storage so uploaded files
 * live in RAM during the request and are streamed directly to R2.
 * No files are written to disk.
 *
 * StorageModule is exported to allow future modules (e.g. MembersModule for
 * photo upload in Phase 8) to inject StorageService without re-importing.
 */
@Module({
  imports: [
    StorageModule,
    PrismaModule,
    AuditModule,
    MulterModule.register({
      storage: memoryStorage(),
    }),
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService, StorageModule],
})
export class DocumentsModule {}
