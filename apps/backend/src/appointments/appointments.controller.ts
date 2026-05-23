import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Request } from 'express';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';
import { CancelAppointmentDto } from './dto/cancel-appointment.dto';
import { QueryAppointmentsDto } from './dto/query-appointments.dto';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { Permission } from '../common/constants/permissions';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

function extractContext(req: Request) {
  const forwarded = req.headers['x-forwarded-for'];
  const ipAddress =
    (Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0]) ??
    req.socket?.remoteAddress ??
    null;
  return {
    ipAddress: ipAddress ?? undefined,
    userAgent: req.headers['user-agent'] ?? undefined,
  };
}

/**
 * AppointmentsController
 *
 * POST   /appointments             — book a new appointment (appointment.create)
 * GET    /appointments             — list appointments (scoped by role)
 * GET    /appointments/:code       — get appointment detail
 * PATCH  /appointments/:code       — reschedule (appointment.manage)
 * POST   /appointments/:code/cancel — cancel with reason
 */
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  // ── POST /appointments ──────────────────────────────────────────────────────

  @Post()
  @RequirePermissions(Permission.APPOINTMENT_CREATE)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateAppointmentDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.appointmentsService.create(
      user.id,
      user.role,
      dto,
      extractContext(req),
    );
  }

  // ── GET /appointments ───────────────────────────────────────────────────────

  @Get()
  @RequirePermissions(Permission.APPOINTMENT_CREATE) // all roles who can create can also read
  async findAll(
    @Query() query: QueryAppointmentsDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.appointmentsService.findAll(user.id, user.role, query);
  }

  // ── GET /appointments/:appointmentCode ─────────────────────────────────────

  @Get(':appointmentCode')
  @RequirePermissions(Permission.APPOINTMENT_CREATE)
  async findOne(
    @Param('appointmentCode') appointmentCode: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.appointmentsService.findByCode(
      user.id,
      user.role,
      appointmentCode,
    );
  }

  // ── PATCH /appointments/:appointmentCode ────────────────────────────────────

  @Patch(':appointmentCode')
  @RequirePermissions(Permission.APPOINTMENT_MANAGE)
  async reschedule(
    @Param('appointmentCode') appointmentCode: string,
    @Body() dto: RescheduleAppointmentDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.appointmentsService.reschedule(
      user.id,
      user.role,
      appointmentCode,
      dto,
      extractContext(req),
    );
  }

  // ── POST /appointments/:appointmentCode/cancel ──────────────────────────────

  @Post(':appointmentCode/cancel')
  @RequirePermissions(Permission.APPOINTMENT_CREATE) // both creators and managers can cancel
  @HttpCode(HttpStatus.OK)
  async cancel(
    @Param('appointmentCode') appointmentCode: string,
    @Body() dto: CancelAppointmentDto,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.appointmentsService.cancel(
      user.id,
      user.role,
      appointmentCode,
      dto,
      extractContext(req),
    );
  }
}
