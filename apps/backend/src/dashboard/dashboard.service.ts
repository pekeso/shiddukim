import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  AppointmentStatus,
  MarriageClassification,
  MarriageRequestStatus,
  MemberStatus,
} from '@prisma/client';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

export interface DashboardSummary {
  totalMembers: number;
  activeMembers: number;
  pendingRequests: number;
  greenCount: number;
  orangeCount: number;
  redCount: number;
  upcomingAppointments: number;
}

export interface MarriageStat {
  month: string;
  submitted: number;
  approved: number;
  rejected: number;
}

export interface AppointmentStat {
  month: string;
  scheduled: number;
  completed: number;
  cancelled: number;
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(user: AuthenticatedUser): Promise<DashboardSummary> {
    const appointmentWhere =
      user.role === 'PASTOR' ? { pastorId: user.id } : undefined;

    const [
      totalMembers,
      activeMembers,
      pendingRequests,
      greenCount,
      orangeCount,
      redCount,
      upcomingAppointments,
    ] = await Promise.all([
      this.prisma.member.count(),
      this.prisma.member.count({ where: { status: MemberStatus.ACTIVATED } }),
      this.prisma.marriageRequest.count({
        where: {
          status: {
            in: [
              MarriageRequestStatus.SUBMITTED,
              MarriageRequestStatus.UNDER_REVIEW,
              MarriageRequestStatus.WAITING_APPOINTMENT,
              MarriageRequestStatus.COUNSELING,
              MarriageRequestStatus.MEDICAL_REFERRAL,
              MarriageRequestStatus.WAITING_RESULTS,
            ],
          },
        },
      }),
      this.prisma.marriageRequest.count({
        where: { classification: MarriageClassification.GREEN },
      }),
      this.prisma.marriageRequest.count({
        where: { classification: MarriageClassification.ORANGE },
      }),
      this.prisma.marriageRequest.count({
        where: { classification: MarriageClassification.RED },
      }),
      this.prisma.appointment.count({
        where: {
          ...appointmentWhere,
          status: {
            in: [AppointmentStatus.SCHEDULED, AppointmentStatus.RESCHEDULED],
          },
          scheduledAt: { gte: new Date() },
        },
      }),
    ]);

    return {
      totalMembers,
      activeMembers,
      pendingRequests,
      greenCount,
      orangeCount,
      redCount,
      upcomingAppointments,
    };
  }

  async getMarriageStats(): Promise<MarriageStat[]> {
    const months = getLastSixMonths();
    const requests = await this.prisma.marriageRequest.findMany({
      where: { createdAt: { gte: months[0].start } },
      select: { createdAt: true, status: true },
    });

    return months.map((month) => {
      const inMonth = requests.filter((request) =>
        isInMonth(request.createdAt, month.start),
      );

      return {
        month: month.label,
        submitted: inMonth.filter(
          (r) => r.status === MarriageRequestStatus.SUBMITTED,
        ).length,
        approved: inMonth.filter(
          (r) => r.status === MarriageRequestStatus.APPROVED,
        ).length,
        rejected: inMonth.filter(
          (r) => r.status === MarriageRequestStatus.REJECTED,
        ).length,
      };
    });
  }

  async getAppointmentStats(
    user: AuthenticatedUser,
  ): Promise<AppointmentStat[]> {
    const months = getLastSixMonths();
    const appointmentWhere =
      user.role === 'PASTOR' ? { pastorId: user.id } : {};

    const appointments = await this.prisma.appointment.findMany({
      where: {
        ...appointmentWhere,
        scheduledAt: { gte: months[0].start },
      },
      select: { scheduledAt: true, status: true },
    });

    return months.map((month) => {
      const inMonth = appointments.filter((appointment) =>
        isInMonth(appointment.scheduledAt, month.start),
      );

      return {
        month: month.label,
        scheduled: inMonth.filter(
          (a) => a.status === AppointmentStatus.SCHEDULED,
        ).length,
        completed: inMonth.filter(
          (a) => a.status === AppointmentStatus.COMPLETED,
        ).length,
        cancelled: inMonth.filter(
          (a) => a.status === AppointmentStatus.CANCELLED,
        ).length,
      };
    });
  }
}

function getLastSixMonths(): { label: string; start: Date }[] {
  const now = new Date();
  const months: { label: string; start: Date }[] = [];

  for (let offset = 5; offset >= 0; offset--) {
    const start = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    months.push({
      label: start.toLocaleDateString('fr-FR', { month: 'short' }),
      start,
    });
  }

  return months;
}

function isInMonth(date: Date, monthStart: Date): boolean {
  return (
    date.getFullYear() === monthStart.getFullYear() &&
    date.getMonth() === monthStart.getMonth()
  );
}
