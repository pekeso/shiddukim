import type { RedisOptions } from 'ioredis';
import type { ConfigService } from '@nestjs/config';
import type { EnvConfig } from './env.validation';

export function getRedisOptions(
  config: ConfigService<EnvConfig, true>,
): RedisOptions {
  const redisUrl = config.get('REDIS_URL', { infer: true });

  if (redisUrl) {
    const url = new URL(redisUrl);
    const database = url.pathname.replace('/', '');

    return {
      host: url.hostname,
      port: url.port ? Number(url.port) : 6379,
      username: url.username ? decodeURIComponent(url.username) : undefined,
      password: url.password ? decodeURIComponent(url.password) : undefined,
      db: database ? Number(database) : undefined,
      tls: url.protocol === 'rediss:' ? {} : undefined,
    };
  }

  return {
    host: config.get('REDIS_HOST', { infer: true }),
    port: config.get('REDIS_PORT', { infer: true }),
  };
}
