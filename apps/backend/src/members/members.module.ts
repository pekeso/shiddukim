import { Module } from '@nestjs/common';
import { MembersService } from './members.service';
import { MembersController } from './members.controller';
import { AuditModule } from '../audit/audit.module';
import { StorageModule } from '../storage/storage.module';

/**
 * MembersModule — manages church member records and profile photos.
 *
 * Exposes:
 *   MembersService — injected by CommunitiesModule (member assignment)
 *
 * Dependencies:
 *   PrismaModule   — global, no explicit import needed
 *   AuditModule    — imported to access AuditService
 *   StorageModule  — imported to access StorageService (R2 upload + signed URLs)
 *                    Used by MembersService for photo upload (Phase 8).
 */
@Module({
  imports: [AuditModule, StorageModule],
  controllers: [MembersController],
  providers: [MembersService],
  exports: [MembersService],
})
export class MembersModule {}
