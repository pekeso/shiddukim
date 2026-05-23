import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { NotificationsService } from '../notifications/notifications.service';
import { APPOINTMENT_REMINDER_QUEUE } from './appointments.constants';
import type { AppointmentReminderPayload } from './appointments.service';

/**
 * AppointmentReminderProcessor
 *
 * Consumes jobs from the `appointment-reminders` BullMQ queue.
 * Each job sends a French reminder email via NotificationsService.
 *
 * Job types:
 *   - '24h' — fired 24 hours before scheduledAt
 *   - '1h'  — fired  1 hour  before scheduledAt
 *
 * Failures are logged but never rethrown — BullMQ will handle retries
 * according to the queue's backoff / attempts configuration.
 */
@Processor(APPOINTMENT_REMINDER_QUEUE)
export class AppointmentReminderProcessor extends WorkerHost {
  private readonly logger = new Logger(AppointmentReminderProcessor.name);

  constructor(private readonly notifications: NotificationsService) {
    super();
  }

  async process(job: Job<AppointmentReminderPayload>): Promise<void> {
    const {
      appointmentCode,
      recipientUserId,
      recipientEmail,
      scheduledAt,
      reminderType,
    } = job.data;

    this.logger.debug(
      `Traitement du rappel ${reminderType} pour ${appointmentCode} → ${recipientEmail}`,
    );

    const date = new Date(scheduledAt);
    const dateStr = formatFrenchDate(date);
    const timeStr = formatFrenchTime(date);

    const delayLabel = reminderType === '24h' ? '24 heures' : '1 heure';

    const subject = 'Rappel de rendez-vous — Plateforme Église';
    const body =
      `Bonjour,\n\n` +
      `Ceci est un rappel automatique : votre rendez-vous est prévu dans ${delayLabel}.\n\n` +
      `Date : ${dateStr}\n` +
      `Heure : ${timeStr}\n` +
      `Référence : ${appointmentCode}\n\n` +
      `Veuillez vous présenter à l'heure.\n\n` +
      `Cordialement,\n` +
      `La Plateforme Église`;

    await this.notifications.sendEmail({
      recipientUserId,
      to: recipientEmail,
      subject,
      body,
    });

    this.logger.log(
      `Rappel ${reminderType} envoyé pour ${appointmentCode} à ${recipientEmail}`,
    );
  }
}

// ─── Date formatting helpers (French locale) ──────────────────────────────────

/** Formats a Date as "lundi 23 mai 2026" (French long date). */
function formatFrenchDate(date: Date): string {
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/** Formats a Date as "14h30" (French time, no seconds). */
function formatFrenchTime(date: Date): string {
  return date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}
