import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client.js';
import type { EnvConfig } from '../common/config/env.validation.js';

/**
 * PrismaService wraps the Prisma v7 TypeScript-native client.
 * Connection is provided via PrismaPg adapter (no DATABASE_URL in schema.prisma).
 */
@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  readonly client: PrismaClient;

  constructor(private readonly configService: ConfigService<EnvConfig, true>) {
    const databaseUrl = this.configService.get('DATABASE_URL', { infer: true });
    const adapter = new PrismaPg({ connectionString: databaseUrl });
    this.client = new PrismaClient({ adapter });
  }

  async onModuleInit(): Promise<void> {
    await this.client.$connect();
    this.logger.log('Connexion à la base de données établie');
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.$disconnect();
    this.logger.log('Connexion à la base de données fermée');
  }

  // Delegate common Prisma operations for ergonomic use in other services
  get user() {
    return this.client.user;
  }

  get member() {
    return this.client.member;
  }
}
