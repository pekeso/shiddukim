import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '../common/decorators/public.decorator';

export interface HealthResponse {
  status: 'ok';
  timestamp: string;
  service: string;
}

/**
 * HealthController — simple liveness probe.
 *
 * @Public()      — no JWT required (infrastructure can call this freely)
 * @SkipThrottle() — excluded from rate limiting (Docker/k8s health checks
 *                   would be blocked otherwise)
 */
@Public()
@SkipThrottle()
@Controller('health')
export class HealthController {
  @Get()
  check(): HealthResponse {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'shiddukim-backend',
    };
  }
}
