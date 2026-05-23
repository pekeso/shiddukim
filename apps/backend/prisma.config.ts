import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// DATABASE_URL is used by Prisma Migrate (CLI).
// At runtime the NestJS app connects via PrismaPg adapter (see PrismaService).
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'npx tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env['DATABASE_URL'],
  },
});
