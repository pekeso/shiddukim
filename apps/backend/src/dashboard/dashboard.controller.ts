import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { Permission } from '../common/constants/permissions';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import {
  DashboardService,
  type AppointmentStat,
  type DashboardSummary,
  type MarriageStat,
} from './dashboard.service';

@Controller('dashboard')
@RequirePermissions(Permission.DASHBOARD_VIEW)
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('summary')
  getSummary(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DashboardSummary> {
    return this.dashboard.getSummary(user);
  }

  @Get('marriage-stats')
  getMarriageStats(): Promise<MarriageStat[]> {
    return this.dashboard.getMarriageStats();
  }

  @Get('appointment-stats')
  getAppointmentStats(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AppointmentStat[]> {
    return this.dashboard.getAppointmentStats(user);
  }
}
