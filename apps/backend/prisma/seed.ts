/**
 * Prisma seed — creates the initial SUPER_ADMIN user.
 *
 * Run:  npx prisma db seed
 *       (or: npx ts-node --esm prisma/seed.ts)
 *
 * The password hash below is a placeholder.
 * In Phase 2 the HashingService (argon2) will replace it.
 * Change the password immediately after first login.
 */

import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import { Role, UserStatus } from '../generated/prisma/enums.js';

const adapter = new PrismaPg({
  connectionString: process.env['DATABASE_URL'] as string,
});
const prisma = new PrismaClient({ adapter });

async function main(): Promise<void> {
  console.log('🌱 Démarrage du seed...');

  // Placeholder hash — replace with a real argon2 hash in Phase 2
  const placeholderHash = '$argon2id$placeholder$replace_in_phase_2';

  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@shiddukim.local' },
    update: {},
    create: {
      email: 'superadmin@shiddukim.local',
      passwordHash: placeholderHash,
      status: UserStatus.ACTIVE,
      role: Role.SUPER_ADMIN,
    },
  });

  console.log(
    `✅ SUPER_ADMIN créé: ${superAdmin.email} (id: ${superAdmin.id})`,
  );
  console.log(
    '⚠️  Changez le mot de passe immédiatement après le premier démarrage.',
  );
}

main()
  .catch((e) => {
    console.error('❌ Seed échoué:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
