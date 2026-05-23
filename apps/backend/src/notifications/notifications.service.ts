import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { PrismaService } from '../prisma/prisma.service';
import {
  NotificationChannel,
  NotificationProvider,
  NotificationStatus,
} from '@prisma/client';
import type { EnvConfig } from '../common/config/env.validation.js';

// ─── Input types ─────────────────────────────────────────────────────────────

export interface SendEmailInput {
  /** User ID of the recipient — stored in the Notification record. */
  recipientUserId: string;
  /** Destination email address. */
  to: string;
  /** French email subject. */
  subject: string;
  /** Plain-text body (HTML is derived from it). */
  body: string;
}

// ─── Service ─────────────────────────────────────────────────────────────────

/**
 * NotificationsService — sends outbound emails via SMTP (Nodemailer) and
 * records every attempt in the `Notification` table.
 *
 * Design rules:
 * - Never crashes the calling code — all errors are caught and stored.
 * - Never exposes provider errors to clients.
 * - Always creates a Notification record regardless of send outcome.
 * - providerMessageId stores the SMTP message-id for correlation.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private transporter: Transporter | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<EnvConfig, true>,
  ) {
    this.initTransporter();
  }

  // ── Private: SMTP transporter setup ─────────────────────────────────────────

  private initTransporter(): void {
    const host = this.config.get('SMTP_HOST', { infer: true });
    const user = this.config.get('SMTP_USER', { infer: true });

    if (!host || !user) {
      this.logger.warn(
        'SMTP non configuré (SMTP_HOST ou SMTP_USER manquant) — ' +
          'les emails de notification ne seront pas envoyés.',
      );
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port: this.config.get('SMTP_PORT', { infer: true }),
      secure:
        (this.config.get('SMTP_SECURE', { infer: true }) as unknown) === true,
      auth: {
        user,
        pass: this.config.get('SMTP_PASS', { infer: true }) ?? '',
      },
    });
  }

  // ── Public API ───────────────────────────────────────────────────────────────

  /**
   * Send an email and persist the result in the Notification table.
   *
   * This method NEVER throws — errors are stored in Notification.errorMessage.
   * The caller can safely fire-and-forget it.
   */
  async sendEmail(input: SendEmailInput): Promise<void> {
    const fromAddress =
      this.config.get('SMTP_FROM_ADDRESS', { infer: true }) ||
      'noreply@eglise.local';
    const fromName =
      this.config.get('SMTP_FROM_NAME', { infer: true }) || 'Plateforme Église';

    // Create the Notification record in PENDING state first
    let notificationId: string | undefined;
    try {
      const record = await this.prisma.notification.create({
        data: {
          recipientUserId: input.recipientUserId,
          channel: NotificationChannel.EMAIL,
          provider: NotificationProvider.SMTP,
          subject: input.subject,
          message: input.body,
          status: NotificationStatus.PENDING,
        },
      });
      notificationId = record.id;
    } catch (err) {
      // If we can't even create the DB record, log and bail — but never throw
      this.logger.error(
        `Impossible de créer l'enregistrement de notification: ${(err as Error).message}`,
      );
      return;
    }

    // If SMTP is not configured, mark FAILED immediately
    if (!this.transporter) {
      await this.markFailed(
        notificationId,
        'SMTP non configuré — transporter indisponible.',
      );
      return;
    }

    // Attempt send
    try {
      const info = await this.transporter.sendMail({
        from: `"${fromName}" <${fromAddress}>`,
        to: input.to,
        subject: input.subject,
        text: input.body,
        html: this.toHtml(input.body),
      });

      await this.prisma.notification.update({
        where: { id: notificationId! },
        data: {
          status: NotificationStatus.SENT,
          providerMessageId: (info.messageId as string | undefined) ?? null,
          sentAt: new Date(),
        },
      });

      this.logger.debug(
        `Email envoyé à ${input.to} — messageId: ${info.messageId}`,
      );
    } catch (err) {
      await this.markFailed(
        notificationId,
        (err as Error).message ?? 'Erreur inconnue',
      );
    }
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private async markFailed(
    notificationId: string | undefined,
    errorMessage: string,
  ): Promise<void> {
    if (!notificationId) return;
    try {
      await this.prisma.notification.update({
        where: { id: notificationId },
        data: {
          status: NotificationStatus.FAILED,
          errorMessage,
        },
      });
    } catch (updateErr) {
      this.logger.error(
        `Impossible de mettre à jour le statut d'échec de la notification ${notificationId}: ` +
          (updateErr as Error).message,
      );
    }
    this.logger.warn(
      `Envoi de notification échoué (${notificationId}): ${errorMessage}`,
    );
  }

  /**
   * Minimal HTML wrapper so email clients render line breaks correctly.
   * The plain-text body is the source of truth; HTML is derived for display.
   */
  private toHtml(text: string): string {
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    const paragraphs = escaped
      .split('\n\n')
      .map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`)
      .join('');
    return `<!DOCTYPE html><html><body style="font-family:sans-serif;color:#1E3A5F">${paragraphs}</body></html>`;
  }
}
