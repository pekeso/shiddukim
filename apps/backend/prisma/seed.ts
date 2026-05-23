import 'dotenv/config';
import * as argon2 from 'argon2';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  AppointmentStatus,
  AppointmentType,
  Gender,
  MarriageClassification,
  MarriageRequestStatus,
  MemberStatus,
  PrismaClient,
  Role,
  UserStatus,
} from '@prisma/client';

const password = 'TestPass123!';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL as string,
});

const prisma = new PrismaClient({ adapter });

async function upsertUser(email: string, role: Role, passwordHash: string) {
  return prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      role,
      status: UserStatus.ACTIVE,
      refreshTokenHash: null,
      refreshTokenExpiresAt: null,
    },
    create: {
      email,
      passwordHash,
      role,
      status: UserStatus.ACTIVE,
    },
  });
}

async function main(): Promise<void> {
  console.log('Starting seed...');

  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });

  const users = {
    superAdmin: await upsertUser(
      'superadmin@shiddukim.test',
      Role.SUPER_ADMIN,
      passwordHash,
    ),
    churchAdmin: await upsertUser(
      'admin@shiddukim.test',
      Role.CHURCH_ADMIN,
      passwordHash,
    ),
    secretary: await upsertUser(
      'secretary@shiddukim.test',
      Role.SECRETARY,
      passwordHash,
    ),
    pastor: await upsertUser(
      'pastor@shiddukim.test',
      Role.PASTOR,
      passwordHash,
    ),
    leader: await upsertUser(
      'leader@shiddukim.test',
      Role.COMMUNITY_LEADER,
      passwordHash,
    ),
    member: await upsertUser(
      'member@shiddukim.test',
      Role.MEMBER,
      passwordHash,
    ),
  };

  const youth = await prisma.community.upsert({
    where: { name: 'Jeunesse' },
    update: {
      description: 'Groupe des jeunes adultes',
    },
    create: {
      name: 'Jeunesse',
      description: 'Groupe des jeunes adultes',
    },
  });

  const choir = await prisma.community.upsert({
    where: { name: 'Chorale' },
    update: {
      description: 'Ministere de louange et chant',
    },
    create: {
      name: 'Chorale',
      description: 'Ministere de louange et chant',
    },
  });

  const prayer = await prisma.community.upsert({
    where: { name: 'Intercession' },
    update: {
      description: 'Equipe de priere',
    },
    create: {
      name: 'Intercession',
      description: 'Equipe de priere',
    },
  });

  const leaderMember = await prisma.member.upsert({
    where: { memberCode: 'SHK-2026-00001' },
    update: {
      firstName: 'Mireille',
      lastName: 'Kouassi',
      gender: Gender.FEMALE,
      email: 'leader@shiddukim.test',
      phone: '+33100000001',
      status: MemberStatus.ACTIVATED,
      communityId: youth.id,
    },
    create: {
      memberCode: 'SHK-2026-00001',
      firstName: 'Mireille',
      lastName: 'Kouassi',
      gender: Gender.FEMALE,
      dateOfBirth: new Date('1990-04-12'),
      placeOfBirth: 'Paris',
      address: '12 rue de la Paix, Paris',
      email: 'leader@shiddukim.test',
      phone: '+33100000001',
      baptismDate: new Date('2012-06-10'),
      baptizedBy: 'Pasteur Bernard',
      status: MemberStatus.ACTIVATED,
      communityId: youth.id,
    },
  });

  const member = await prisma.member.upsert({
    where: { memberCode: 'SHK-2026-00002' },
    update: {
      firstName: 'David',
      lastName: 'Mensah',
      gender: Gender.MALE,
      email: 'member@shiddukim.test',
      phone: '+33100000002',
      status: MemberStatus.ACTIVATED,
      communityId: choir.id,
    },
    create: {
      memberCode: 'SHK-2026-00002',
      firstName: 'David',
      lastName: 'Mensah',
      gender: Gender.MALE,
      dateOfBirth: new Date('1988-09-23'),
      placeOfBirth: 'Lyon',
      address: '8 avenue Victor Hugo, Lyon',
      email: 'member@shiddukim.test',
      phone: '+33100000002',
      baptismDate: new Date('2015-03-22'),
      baptizedBy: 'Pasteur Bernard',
      status: MemberStatus.ACTIVATED,
      communityId: choir.id,
    },
  });

  const secondMember = await prisma.member.upsert({
    where: { memberCode: 'SHK-2026-00003' },
    update: {
      firstName: 'Sarah',
      lastName: 'Traore',
      gender: Gender.FEMALE,
      email: 'sarah.traore@shiddukim.test',
      phone: '+33100000003',
      status: MemberStatus.ACTIVATED,
      communityId: prayer.id,
    },
    create: {
      memberCode: 'SHK-2026-00003',
      firstName: 'Sarah',
      lastName: 'Traore',
      gender: Gender.FEMALE,
      dateOfBirth: new Date('1994-01-15'),
      placeOfBirth: 'Marseille',
      address: '21 boulevard Longchamp, Marseille',
      email: 'sarah.traore@shiddukim.test',
      phone: '+33100000003',
      baptismDate: new Date('2018-11-04'),
      baptizedBy: 'Pasteur Alain',
      status: MemberStatus.ACTIVATED,
      communityId: prayer.id,
    },
  });

  await prisma.community.update({
    where: { id: youth.id },
    data: { presidentMemberId: leaderMember.id },
  });

  await prisma.userMemberLink.upsert({
    where: {
      userId_memberId: {
        userId: users.leader.id,
        memberId: leaderMember.id,
      },
    },
    update: {
      verifiedAt: new Date(),
    },
    create: {
      userId: users.leader.id,
      memberId: leaderMember.id,
      verifiedAt: new Date(),
    },
  });

  await prisma.userMemberLink.upsert({
    where: {
      userId_memberId: {
        userId: users.member.id,
        memberId: member.id,
      },
    },
    update: {
      verifiedAt: new Date(),
    },
    create: {
      userId: users.member.id,
      memberId: member.id,
      verifiedAt: new Date(),
    },
  });

  const request = await prisma.marriageRequest.upsert({
    where: { requestCode: 'MAR-2026-00001' },
    update: {
      memberId: member.id,
      spouseFullName: 'Esther Nguessan',
      spousePhone: '+33100001002',
      spouseEmail: 'esther.nguessan@shiddukim.test',
      intendedMarriageDate: new Date('2026-09-12'),
      status: MarriageRequestStatus.UNDER_REVIEW,
      classification: MarriageClassification.ORANGE,
      pastorNotes: 'Prevoir un entretien pastoral complementaire.',
      submittedAt: new Date('2026-05-20T10:00:00Z'),
      reviewedAt: new Date('2026-05-22T14:30:00Z'),
    },
    create: {
      requestCode: 'MAR-2026-00001',
      memberId: member.id,
      spouseFullName: 'Esther Nguessan',
      spousePhone: '+33100001002',
      spouseEmail: 'esther.nguessan@shiddukim.test',
      intendedMarriageDate: new Date('2026-09-12'),
      status: MarriageRequestStatus.UNDER_REVIEW,
      classification: MarriageClassification.ORANGE,
      pastorNotes: 'Prevoir un entretien pastoral complementaire.',
      submittedAt: new Date('2026-05-20T10:00:00Z'),
      reviewedAt: new Date('2026-05-22T14:30:00Z'),
    },
  });

  await prisma.marriageRequest.upsert({
    where: { requestCode: 'MAR-2026-00002' },
    update: {
      memberId: secondMember.id,
      spouseFullName: 'Daniel Okafor',
      spousePhone: '+33100001003',
      spouseEmail: 'daniel.okafor@shiddukim.test',
      intendedMarriageDate: new Date('2026-11-07'),
      status: MarriageRequestStatus.SUBMITTED,
      submittedAt: new Date('2026-05-18T09:15:00Z'),
    },
    create: {
      requestCode: 'MAR-2026-00002',
      memberId: secondMember.id,
      spouseFullName: 'Daniel Okafor',
      spousePhone: '+33100001003',
      spouseEmail: 'daniel.okafor@shiddukim.test',
      intendedMarriageDate: new Date('2026-11-07'),
      status: MarriageRequestStatus.SUBMITTED,
      submittedAt: new Date('2026-05-18T09:15:00Z'),
    },
  });

  await prisma.appointment.upsert({
    where: { appointmentCode: 'APT-2026-00001' },
    update: {
      memberId: member.id,
      pastorId: users.pastor.id,
      marriageRequestId: request.id,
      appointmentType: AppointmentType.MARRIAGE_REVIEW,
      status: AppointmentStatus.SCHEDULED,
      scheduledAt: new Date('2026-05-28T15:00:00Z'),
      notes: 'Premier rendez-vous de revue du dossier matrimonial.',
    },
    create: {
      appointmentCode: 'APT-2026-00001',
      memberId: member.id,
      pastorId: users.pastor.id,
      marriageRequestId: request.id,
      appointmentType: AppointmentType.MARRIAGE_REVIEW,
      status: AppointmentStatus.SCHEDULED,
      scheduledAt: new Date('2026-05-28T15:00:00Z'),
      notes: 'Premier rendez-vous de revue du dossier matrimonial.',
    },
  });

  await prisma.appointment.upsert({
    where: { appointmentCode: 'APT-2026-00002' },
    update: {
      memberId: secondMember.id,
      pastorId: users.pastor.id,
      appointmentType: AppointmentType.PASTORAL_COUNSELING,
      status: AppointmentStatus.COMPLETED,
      scheduledAt: new Date('2026-05-21T13:00:00Z'),
      notes: 'Accompagnement pastoral initial.',
    },
    create: {
      appointmentCode: 'APT-2026-00002',
      memberId: secondMember.id,
      pastorId: users.pastor.id,
      appointmentType: AppointmentType.PASTORAL_COUNSELING,
      status: AppointmentStatus.COMPLETED,
      scheduledAt: new Date('2026-05-21T13:00:00Z'),
      notes: 'Accompagnement pastoral initial.',
    },
  });

  console.log('Seed complete.');
  console.table([
    { role: 'SUPER_ADMIN', email: 'superadmin@shiddukim.test', password },
    { role: 'CHURCH_ADMIN', email: 'admin@shiddukim.test', password },
    { role: 'SECRETARY', email: 'secretary@shiddukim.test', password },
    { role: 'PASTOR', email: 'pastor@shiddukim.test', password },
    { role: 'COMMUNITY_LEADER', email: 'leader@shiddukim.test', password },
    { role: 'MEMBER', email: 'member@shiddukim.test', password },
  ]);
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
