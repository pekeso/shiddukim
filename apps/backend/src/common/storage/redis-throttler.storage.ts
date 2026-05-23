import type { ThrottlerStorage } from '@nestjs/throttler';
import Redis from 'ioredis';

/**
 * Redis-backed storage for @nestjs/throttler (v6+).
 *
 * Implements a fixed-window rate-limiting strategy.
 *
 * Key namespacing:
 *   hits  → `throttle:{throttlerName}:{key}`
 *   block → `throttle:block:{throttlerName}:{key}`
 *
 * The `ttl` argument received from the guard is in seconds.
 * Redis `pexpire` / `pttl` operate in milliseconds — all conversions are
 * explicit here.
 *
 * This class is NOT an injectable NestJS provider — it is instantiated
 * directly inside ThrottlerModule.forRootAsync useFactory so that it receives
 * host/port from ConfigService before the DI container is fully ready.
 */
export class RedisThrottlerStorage implements ThrottlerStorage {
  readonly redis: Redis;

  constructor(host: string, port: number) {
    this.redis = new Redis({
      host,
      port,
      // Fail fast if Redis is unreachable rather than queueing indefinitely
      lazyConnect: false,
      enableOfflineQueue: false,
      retryStrategy: (times) => {
        // Retry up to 5 times with 500 ms delay, then give up
        if (times > 5) return null;
        return 500;
      },
    });
  }

  async increment(
    key: string,
    ttl: number, // seconds (from ThrottlerOptions.ttl)
    limit: number,
    blockDuration: number, // seconds (from ThrottlerOptions.blockDuration)
    throttlerName: string,
  ) {
    const hitKey = `throttle:${throttlerName}:${key}`;
    const blockKey = `throttle:block:${throttlerName}:${key}`;

    // ── Check block ─────────────────────────────────────────────────────────────
    const blockTtlMs = await this.redis.pttl(blockKey);
    if (blockTtlMs > 0) {
      return {
        totalHits: limit + 1,
        timeToExpire: Math.max(await this.redis.pttl(hitKey), 0),
        isBlocked: true,
        timeToBlockExpire: blockTtlMs,
      };
    }

    // ── Increment hit counter ────────────────────────────────────────────────────
    // INCR is atomic; Redis initialises missing keys to 0 before incrementing,
    // so totalHits === 1 means this is the first hit in the current window.
    const totalHits = await this.redis.incr(hitKey);
    if (totalHits === 1) {
      // First hit — set the TTL.
      // A narrow race between INCR and PEXPIRE is acceptable for brute-force
      // protection; the key will eventually expire even if PEXPIRE is delayed.
      await this.redis.pexpire(hitKey, ttl * 1000);
    }

    const timeToExpireMs = Math.max(await this.redis.pttl(hitKey), 0);
    const isBlocked = totalHits > limit;

    let timeToBlockExpireMs = 0;
    if (isBlocked && blockDuration > 0) {
      await this.redis.set(blockKey, '1', 'PX', blockDuration * 1000);
      timeToBlockExpireMs = blockDuration * 1000;
    }

    return {
      totalHits,
      timeToExpire: timeToExpireMs,
      isBlocked,
      timeToBlockExpire: timeToBlockExpireMs,
    };
  }
}
