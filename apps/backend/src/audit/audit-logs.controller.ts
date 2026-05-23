import { Controller, Get, Query } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { Permission } from '../common/constants/permissions';
import { QueryAuditLogsDto } from './dto/query-audit-logs.dto';

/**
 * AuditLogsController — read-only access to the audit trail.
 *
 * Base path: /api/v1/audit-logs (global prefix + this controller path)
 *
 * All routes require the `audit.view` permission.
 * Only SUPER_ADMIN and CHURCH_ADMIN hold this permission (see role-permissions.ts).
 *
 * Responses are in French.
 */
@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * GET /api/v1/audit-logs
   *
   * Returns a paginated list of audit events in reverse chronological order.
   *
   * Query parameters:
   *   actorUserId — filter by actor
   *   action      — filter by action constant (e.g. "auth.login")
   *   entityType  — filter by entity type (e.g. "User")
   *   from        — start date (ISO-8601, inclusive)
   *   to          — end date (ISO-8601, inclusive — end-of-day boundary applied)
   *   page        — page number (default 1)
   *   limit       — page size (default 20, max 100)
   *
   * Returns:
   *   { data, total, page, limit, pages }
   */
  @Get()
  @RequirePermissions(Permission.AUDIT_VIEW)
  async findAll(@Query() query: QueryAuditLogsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    // Build the date range filter when from/to are provided
    const createdAtFilter =
      query.from || query.to
        ? {
            ...(query.from ? { gte: new Date(query.from) } : {}),
            ...(query.to
              ? (() => {
                  // Advance "to" to the next day so the full "to" day is included
                  const toDate = new Date(query.to);
                  toDate.setDate(toDate.getDate() + 1);
                  return { lt: toDate };
                })()
              : {}),
          }
        : undefined;

    const where = {
      ...(query.actorUserId ? { actorUserId: query.actorUserId } : {}),
      ...(query.action ? { action: query.action } : {}),
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }
}
