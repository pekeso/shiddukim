import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../common/constants/audit-actions';
import { AppointmentStatus, AppointmentType, Role } from '@prisma/client';
import type { CreateAppointmentDto } from './dto/create-appointment.dto';
import type { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';
import type { CancelAppointmentDto } from './dto/cancel-appointment.dto';
import type { QueryAppointmentsDto } from './dto/query-appointments.dto';
import type { RequestContext } from '../auth/auth.service';
import { APPOINTMENT_REMINDER_QUEUE } from './appointments.constants';

// ─── Response shapes ──────────────────────────────────────────────────────────

export interface AppointmentResponse {
  /** Public code — the only identifier returned to API clients (APT-YYYY-NNNNN). */
  appointmentCode: string;
  /** Public member code of the person who booked. */
  memberCode: string;
  appointmentType: string;
  status: string;
  scheduledAt: string;
  notes: string | null;
  cancelReason: string | null;
  /** Public code of the linked marriage request (null if not linked). */
  marriageRequestCode: string | null;
  /** User ID of the assigned pastor (null if not yet assigned). */
  pastorId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedAppointments {
  data: AppointmentResponse[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

// ─── Reminder job payload ─────────────────────────────────────────────────────

export interface AppointmentReminderPayload {
  appointmentId: string;
  appointmentCode: string;
  recipientUserId: string;
  recipientEmail: string;
  recipientName: string;
  scheduledAt: string; // ISO
  reminderType: '24h' | '1h';
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    @InjectQueue(APPOINTMENT_REMINDER_QUEUE)
    private readonly reminderQueue: Queue<AppointmentReminderPayload>,
  ) {}

  // ── Create ───────────────────────────────────────────────────────────────────

  async create(
    actorUserId: string,
    actorRole: string,
    dto: CreateAppointmentDto,
    ctx: RequestContext,
  ): Promise<AppointmentResponse> {
    // 1. Validate scheduledAt is in the future
    const scheduledAt = new Date(dto.scheduledAt);
    if (scheduledAt <= new Date()) {
      throw new BadRequestException(
        'La date du rendez-vous doit être dans le futur.',
      );
    }

    // 2. Resolve the requesting member
    const memberLink = await this.prisma.userMemberLink.findFirst({
      where: { userId: actorUserId },
      include: { member: true },
    });

    // Staff can book on behalf of any member — but for MVP we always require
    // the actor to be linked to a member record.
    if (!memberLink) {
      throw new BadRequestException(
        "Aucun dossier membre n'est associé à votre compte. " +
          'Veuillez contacter le secrétariat.',
      );
    }

    // 3. Resolve optional marriageRequestId from public code
    let marriageRequestId: string | null = null;
    let marriageRequestCode: string | null = null;
    if (dto.marriageRequestCode) {
      const req = await this.prisma.marriageRequest.findUnique({
        where: { requestCode: dto.marriageRequestCode },
      });
      if (!req) {
        throw new NotFoundException(
          `Le dossier matrimonial "${dto.marriageRequestCode}" est introuvable.`,
        );
      }
      marriageRequestId = req.id;
      marriageRequestCode = req.requestCode;
    }

    // 4. Validate pastorId if provided
    if (dto.pastorId) {
      const pastor = await this.prisma.user.findUnique({
        where: { id: dto.pastorId },
      });
      if (!pastor || pastor.role !== Role.PASTOR) {
        throw new BadRequestException(
          "L'identifiant pasteur fourni ne correspond pas à un pasteur actif.",
        );
      }
    }

    // 5. Generate appointment code
    const appointmentCode = await this.generateAppointmentCode();

    // 6. Persist
    const appointment = await this.prisma.appointment.create({
      data: {
        appointmentCode,
        memberId: memberLink.memberId,
        pastorId: dto.pastorId ?? null,
        marriageRequestId,
        appointmentType: dto.appointmentType,
        scheduledAt,
        status: AppointmentStatus.SCHEDULED,
        notes: dto.notes ?? null,
      },
      include: {
        member: true,
        marriageRequest: true,
      },
    });

    // 7. Queue reminder jobs (fire-and-forget — never crash if queue is unavailable)
    const jobIds = await this.queueReminders(appointment, actorUserId);

    // Store job IDs so they can be cancelled on reschedule/cancel
    if (jobIds.jobId24h || jobIds.jobId1h) {
      await this.prisma.appointment.update({
        where: { id: appointment.id },
        data: {
          jobId24h: jobIds.jobId24h ?? null,
          jobId1h: jobIds.jobId1h ?? null,
        },
      });
    }

    // 8. Audit
    this.audit.log({
      actorUserId,
      action: AuditAction.APPOINTMENT.CREATED,
      entityType: 'Appointment',
      entityId: appointmentCode,
      metadata: {
        memberCode: memberLink.member.memberCode,
        appointmentType: dto.appointmentType,
        scheduledAt: scheduledAt.toISOString(),
        marriageRequestCode,
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return this.toResponse(appointment, memberLink.member.memberCode);
  }

  // ── Find all ─────────────────────────────────────────────────────────────────

  async findAll(
    actorUserId: string,
    actorRole: string,
    query: QueryAppointmentsDto,
  ): Promise<PaginatedAppointments> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    // Build where clause based on role
    const where: Record<string, unknown> = {};

    if (query.status) {
      where.status = query.status;
    }

    if (actorRole === Role.MEMBER) {
      // Members see only their own appointments
      const link = await this.prisma.userMemberLink.findFirst({
        where: { userId: actorUserId },
      });
      if (!link) {
        return { data: [], total: 0, page, limit, pages: 0 };
      }
      where.memberId = link.memberId;
    } else if (actorRole === Role.PASTOR) {
      // Pastors see appointments assigned to them
      where.pastorId = actorUserId;
    }
    // SUPER_ADMIN, CHURCH_ADMIN, SECRETARY, COMMUNITY_LEADER — see all

    const [items, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where,
        include: { member: true, marriageRequest: true },
        orderBy: { scheduledAt: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.appointment.count({ where }),
    ]);

    return {
      data: items.map((a) => this.toResponse(a, a.member.memberCode)),
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  // ── Find one ─────────────────────────────────────────────────────────────────

  async findByCode(
    actorUserId: string,
    actorRole: string,
    appointmentCode: string,
  ): Promise<AppointmentResponse> {
    const appointment = await this.findAppointmentOrThrow(appointmentCode);

    // Enforce ownership for MEMBER role
    if (actorRole === Role.MEMBER) {
      await this.enforceOwnership(
        actorUserId,
        appointment.memberId,
        appointmentCode,
      );
    }

    return this.toResponse(appointment, appointment.member.memberCode);
  }

  // ── Reschedule ───────────────────────────────────────────────────────────────

  async reschedule(
    actorUserId: string,
    actorRole: string,
    appointmentCode: string,
    dto: RescheduleAppointmentDto,
    ctx: RequestContext,
  ): Promise<AppointmentResponse> {
    if (!dto.scheduledAt && !dto.notes) {
      throw new BadRequestException(
        'Au moins un champ doit être fourni : scheduledAt ou notes.',
      );
    }

    const appointment = await this.findAppointmentOrThrow(appointmentCode);

    // Guard: cannot reschedule terminal statuses
    if (
      appointment.status === AppointmentStatus.CANCELLED ||
      appointment.status === AppointmentStatus.COMPLETED
    ) {
      throw new BadRequestException(
        `Impossible de replanifier un rendez-vous au statut "${appointment.status}".`,
      );
    }

    let newScheduledAt: Date | undefined;
    if (dto.scheduledAt) {
      newScheduledAt = new Date(dto.scheduledAt);
      if (newScheduledAt <= new Date()) {
        throw new BadRequestException(
          'La nouvelle date du rendez-vous doit être dans le futur.',
        );
      }
    }

    // Cancel existing reminder jobs before updating
    await this.cancelReminderJobs(appointment.jobId24h, appointment.jobId1h);

    const updated = await this.prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        status: AppointmentStatus.RESCHEDULED,
        ...(newScheduledAt ? { scheduledAt: newScheduledAt } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
        // Clear old job IDs — new ones will be queued below
        jobId24h: null,
        jobId1h: null,
      },
      include: { member: true, marriageRequest: true },
    });

    // Queue new reminders for the updated appointment
    const jobIds = await this.queueReminders(updated, actorUserId);
    if (jobIds.jobId24h || jobIds.jobId1h) {
      await this.prisma.appointment.update({
        where: { id: updated.id },
        data: {
          jobId24h: jobIds.jobId24h ?? null,
          jobId1h: jobIds.jobId1h ?? null,
        },
      });
    }

    this.audit.log({
      actorUserId,
      action: AuditAction.APPOINTMENT.CREATED, // RESCHEDULED reuses CREATED domain; no separate action defined
      entityType: 'Appointment',
      entityId: appointmentCode,
      metadata: {
        event: 'rescheduled',
        newScheduledAt: newScheduledAt?.toISOString() ?? null,
        memberCode: appointment.member.memberCode,
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return this.toResponse(updated, updated.member.memberCode);
  }

  // ── Cancel ───────────────────────────────────────────────────────────────────

  async cancel(
    actorUserId: string,
    actorRole: string,
    appointmentCode: string,
    dto: CancelAppointmentDto,
    ctx: RequestContext,
  ): Promise<AppointmentResponse> {
    const appointment = await this.findAppointmentOrThrow(appointmentCode);

    if (
      appointment.status === AppointmentStatus.CANCELLED ||
      appointment.status === AppointmentStatus.COMPLETED
    ) {
      throw new BadRequestException(
        `Impossible d'annuler un rendez-vous au statut "${appointment.status}".`,
      );
    }

    // MEMBER can only cancel their own appointments
    if (actorRole === Role.MEMBER) {
      await this.enforceOwnership(
        actorUserId,
        appointment.memberId,
        appointmentCode,
      );
    }

    // Cancel queued reminder jobs
    await this.cancelReminderJobs(appointment.jobId24h, appointment.jobId1h);

    const updated = await this.prisma.appointment.update({
      where: { id: appointment.id },
      data: {
        status: AppointmentStatus.CANCELLED,
        cancelReason: dto.reason,
        jobId24h: null,
        jobId1h: null,
      },
      include: { member: true, marriageRequest: true },
    });

    this.audit.log({
      actorUserId,
      action: AuditAction.APPOINTMENT.CREATED, // domain event — reusing CREATED; cancel is audited via metadata
      entityType: 'Appointment',
      entityId: appointmentCode,
      metadata: {
        event: 'cancelled',
        reason: dto.reason,
        memberCode: appointment.member.memberCode,
      },
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });

    return this.toResponse(updated, updated.member.memberCode);
  }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private async findAppointmentOrThrow(appointmentCode: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { appointmentCode },
      include: { member: true, marriageRequest: true },
    });
    if (!appointment) {
      throw new NotFoundException(
        `Le rendez-vous "${appointmentCode}" est introuvable.`,
      );
    }
    return appointment;
  }

  private async enforceOwnership(
    actorUserId: string,
    appointmentMemberId: string,
    appointmentCode: string,
  ): Promise<void> {
    const link = await this.prisma.userMemberLink.findFirst({
      where: { userId: actorUserId },
    });
    if (!link || link.memberId !== appointmentMemberId) {
      throw new ForbiddenException(
        `Vous n'êtes pas autorisé à accéder au rendez-vous "${appointmentCode}".`,
      );
    }
  }

  /**
   * Generates a unique appointment code: APT-YYYY-NNNNN.
   * Retries up to 3 times on collision; falls back to a UUID-based code.
   */
  private async generateAppointmentCode(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `APT-${year}-`;

    for (let attempt = 0; attempt < 3; attempt++) {
      const last = await this.prisma.appointment.findFirst({
        where: { appointmentCode: { startsWith: prefix } },
        orderBy: { appointmentCode: 'desc' },
        select: { appointmentCode: true },
      });

      const lastSeq = last
        ? parseInt(last.appointmentCode.split('-')[2], 10)
        : 0;
      const nextSeq = (lastSeq + 1).toString().padStart(5, '0');
      const code = `${prefix}${nextSeq}`;

      const existing = await this.prisma.appointment.findUnique({
        where: { appointmentCode: code },
      });
      if (!existing) return code;
    }

    // UUID fallback on persistent collision
    return `APT-${year}-${randomUUID().slice(0, 8).toUpperCase()}`;
  }

  /**
   * Queues 24h and 1h reminder jobs for the appointment.
   * Returns the job IDs so they can be stored and later cancelled.
   * Never throws — if the queue is unavailable the app continues normally.
   */
  private async queueReminders(
    appointment: {
      id: string;
      appointmentCode: string;
      scheduledAt: Date;
      member: { id: string; memberCode: string; email: string | null };
      memberId: string;
    },
    actorUserId: string,
  ): Promise<{ jobId24h: string | null; jobId1h: string | null }> {
    // Fetch the linked user to get their email
    const userLink = await this.prisma.userMemberLink.findFirst({
      where: { memberId: appointment.memberId },
      include: { user: true },
    });

    if (!userLink?.user?.email) {
      this.logger.warn(
        `Impossible de planifier les rappels pour ${appointment.appointmentCode} ` +
          '— aucun email trouvé pour ce membre.',
      );
      return { jobId24h: null, jobId1h: null };
    }

    const payload: Omit<AppointmentReminderPayload, 'reminderType'> = {
      appointmentId: appointment.id,
      appointmentCode: appointment.appointmentCode,
      recipientUserId: userLink.user.id,
      recipientEmail: userLink.user.email,
      recipientName: appointment.member.memberCode,
      scheduledAt: appointment.scheduledAt.toISOString(),
    };

    const scheduledAt = appointment.scheduledAt.getTime();
    const now = Date.now();

    const delay24h = scheduledAt - now - 24 * 60 * 60 * 1000;
    const delay1h = scheduledAt - now - 60 * 60 * 1000;

    let jobId24h: string | null = null;
    let jobId1h: string | null = null;

    try {
      if (delay24h > 0) {
        const job = await this.reminderQueue.add(
          'reminder',
          { ...payload, reminderType: '24h' },
          { delay: delay24h, jobId: `reminder-24h-${appointment.id}` },
        );
        jobId24h = job.id ?? null;
      }

      if (delay1h > 0) {
        const job = await this.reminderQueue.add(
          'reminder',
          { ...payload, reminderType: '1h' },
          { delay: delay1h, jobId: `reminder-1h-${appointment.id}` },
        );
        jobId1h = job.id ?? null;
      }
    } catch (err) {
      this.logger.error(
        `Impossible de planifier les rappels pour ${appointment.appointmentCode}: ` +
          (err as Error).message,
      );
    }

    return { jobId24h, jobId1h };
  }

  /**
   * Cancels pending BullMQ reminder jobs by ID.
   * Never throws — if the queue is unavailable the cancellation is silently skipped.
   */
  private async cancelReminderJobs(
    jobId24h: string | null,
    jobId1h: string | null,
  ): Promise<void> {
    for (const jobId of [jobId24h, jobId1h]) {
      if (!jobId) continue;
      try {
        const job = await this.reminderQueue.getJob(jobId);
        if (job) {
          await job.remove();
          this.logger.debug(`Rappel supprimé : jobId=${jobId}`);
        }
      } catch (err) {
        this.logger.warn(
          `Impossible de supprimer le rappel jobId=${jobId}: ` +
            (err as Error).message,
        );
      }
    }
  }

  /**
   * Maps a Prisma Appointment record to the public-facing AppointmentResponse.
   * Never includes internal database IDs.
   */
  private toResponse(
    appointment: {
      appointmentCode: string;
      appointmentType: AppointmentType;
      status: AppointmentStatus;
      scheduledAt: Date;
      notes: string | null;
      cancelReason: string | null;
      pastorId: string | null;
      createdAt: Date;
      updatedAt: Date;
      marriageRequest: { requestCode: string } | null;
    },
    memberCode: string,
  ): AppointmentResponse {
    return {
      appointmentCode: appointment.appointmentCode,
      memberCode,
      appointmentType: appointment.appointmentType,
      status: appointment.status,
      scheduledAt: appointment.scheduledAt.toISOString(),
      notes: appointment.notes,
      cancelReason: appointment.cancelReason,
      marriageRequestCode: appointment.marriageRequest?.requestCode ?? null,
      pastorId: appointment.pastorId,
      createdAt: appointment.createdAt.toISOString(),
      updatedAt: appointment.updatedAt.toISOString(),
    };
  }
}
