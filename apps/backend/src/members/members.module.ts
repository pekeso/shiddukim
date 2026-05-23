import { Module } from '@nestjs/common';
import { MembersService } from './members.service';
import { MembersController } from './members.controller';
import { AuditModule } from '../audit/audit.module';

/**
 * MembersModule — manages church member records.
 *
 * Exposes:
 *   MembersService — injected by CommunitiesModule (member assignment)
 *
 * Dependencies:
 *   PrismaModule   — global, no explicit import needed
 *   AuditModule    — imported to access AuditService
 */
@Module({
  imports: [AuditModule],
  controllers: [MembersController],
  providers: [MembersService],
  exports: [MembersService],
})
export class MembersModule {}
