import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppointmentsService } from './appointments.service';
import { AppointmentsController } from './appointments.controller';
import { AppointmentReminderProcessor } from './appointment-reminder.processor';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { APPOINTMENT_REMINDER_QUEUE } from './appointments.constants';
import type { EnvConfig } from '../common/config/env.validation.js';
import { getRedisOptions } from '../common/config/redis.config';

/**
 * AppointmentsModule
 *
 * Provides:
 *   - AppointmentsService  — CRUD + appointment code generation
 *   - AppointmentsController — REST endpoints under /appointments
 *   - AppointmentReminderProcessor — BullMQ worker for email reminders
 *
 * Depends on:
 *   - PrismaModule      — database access
 *   - AuditModule       — audit logging
 *   - NotificationsModule — email sending via Nodemailer
 *   - BullMQ queue      — appointment-reminders (connected to Redis)
 */
@Module({
  imports: [
    PrismaModule,
    AuditModule,
    NotificationsModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvConfig, true>) => ({
        connection: getRedisOptions(config),
      }),
    }),
    BullModule.registerQueue({
      name: APPOINTMENT_REMINDER_QUEUE,
    }),
  ],
  controllers: [AppointmentsController],
  providers: [AppointmentsService, AppointmentReminderProcessor],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
