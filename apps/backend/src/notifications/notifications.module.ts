import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * NotificationsModule — provides NotificationsService to any module that imports it.
 *
 * NotificationsService handles:
 *   - Sending emails via Nodemailer (SMTP)
 *   - Recording every attempt in the Notification table
 *   - Graceful degradation when SMTP is not configured
 */
@Module({
  imports: [PrismaModule],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
