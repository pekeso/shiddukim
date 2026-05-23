import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { validate } from './common/config/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { AuditModule } from './audit/audit.module';
import { VerificationModule } from './verification/verification.module';
import { MembersModule } from './members/members.module';
import { CommunitiesModule } from './communities/communities.module';
import { DocumentsModule } from './documents/documents.module';
import { HealthController } from './health/health.controller';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { RedisThrottlerStorage } from './common/storage/redis-throttler.storage';

/**
 * AppModule — application root module.
 *
 * Global guards (applied to every request in order):
 *   1. ThrottlerGuard     — rate limiting via Redis (brute-force protection)
 *   2. JwtAuthGuard       — JWT validation; skips routes marked @Public()
 *   3. PermissionsGuard   — RBAC; skips routes marked @Public() or without
 *                           @RequirePermissions()
 *
 * To make a route public (no auth required):
 *   @Public()   ← from src/common/decorators/public.decorator.ts
 *
 * To restrict a route to specific permissions:
 *   @RequirePermissions(Permission.MEMBER_CREATE)
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
      envFilePath: ['.env'],
    }),
    PrismaModule,
    AuthModule,
    AuditModule,
    VerificationModule,
    MembersModule,
    CommunitiesModule,
    DocumentsModule,

    // ── Rate limiting ────────────────────────────────────────────────────────────
    // Global throttle: 60 requests per 60 seconds per IP.
    // Sensitive endpoints override this with @Throttle() for stricter limits.
    // Storage is Redis so limits are shared across app instances.
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            name: 'default',
            ttl: 60, // seconds
            limit: 60, // requests per window
          },
        ],
        storage: new RedisThrottlerStorage(
          config.get<string>('REDIS_HOST') ?? 'localhost',
          config.get<number>('REDIS_PORT') ?? 6379,
        ),
      }),
    }),
  ],
  controllers: [HealthController],
  providers: [
    // ── Global guards ────────────────────────────────────────────────────────────
    // Execution order follows declaration order.
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard, // 1. Rate limit before any processing
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard, // 2. Auth — populates request.user
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard, // 3. RBAC — checks request.user.role
    },
  ],
})
export class AppModule {}
