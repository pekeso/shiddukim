import { Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditLogsController } from './audit-logs.controller';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * AuditModule — centralises all audit logging concerns.
 *
 * Exports AuditService so any other module can inject it and call
 * `auditService.log(...)` without importing this module explicitly
 * (AuditModule just needs to be imported once at the root).
 *
 * Usage in another module:
 *   imports: [AuditModule]
 *   constructor(private readonly audit: AuditService) {}
 */
@Module({
  imports: [PrismaModule],
  controllers: [AuditLogsController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
