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

  // ── Users ────────────────────────────────────────────────────────────────────
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
    // MEMBER accounts — each linked to a member record below
    member1: await upsertUser(
      'member@shiddukim.test',
      Role.MEMBER,
      passwordHash,
    ),
    member2: await upsertUser(
      'member2@shiddukim.test',
      Role.MEMBER,
      passwordHash,
    ),
    member3: await upsertUser(
      'member3@shiddukim.test',
      Role.MEMBER,
      passwordHash,
    ),
    // member4 has NO marriage request — use this account to test the new form
    member4: await upsertUser(
      'member4@shiddukim.test',
      Role.MEMBER,
      passwordHash,
    ),
  };

  // ── Communities (church sites in Kinshasa) ────────────────────────────────────
  const limete = await prisma.community.upsert({
    where: { name: 'Limete' },
    update: { description: 'Site de Limete — Avenue Kabinda, C. Limete' },
    create: {
      name: 'Limete',
      description: 'Site de Limete — Avenue Kabinda, C. Limete',
    },
  });

  const matete = await prisma.community.upsert({
    where: { name: 'Matete' },
    update: { description: 'Site de Matete — Bld Lumumba, C. Matete' },
    create: {
      name: 'Matete',
      description: 'Site de Matete — Bld Lumumba, C. Matete',
    },
  });

  const lingwala = await prisma.community.upsert({
    where: { name: 'Lingwala' },
    update: {
      description: 'Site de Lingwala — Avenue des Huileries, C. Lingwala',
    },
    create: {
      name: 'Lingwala',
      description: 'Site de Lingwala — Avenue des Huileries, C. Lingwala',
    },
  });

  const kintambo = await prisma.community.upsert({
    where: { name: 'Kintambo' },
    update: {
      description: 'Site de Kintambo — Avenue Poids Lourds, C. Kintambo',
    },
    create: {
      name: 'Kintambo',
      description: 'Site de Kintambo — Avenue Poids Lourds, C. Kintambo',
    },
  });

  const kalamu = await prisma.community.upsert({
    where: { name: 'Kalamu' },
    update: { description: 'Site de Kalamu — Avenue Bokassa, C. Kalamu' },
    create: {
      name: 'Kalamu',
      description: 'Site de Kalamu — Avenue Bokassa, C. Kalamu',
    },
  });

  // ── Members ───────────────────────────────────────────────────────────────────
  // SHK-2026-00001 — Mireille Ntumba (community leader, Limete)
  const mireille = await prisma.member.upsert({
    where: { memberCode: 'SHK-2026-00001' },
    update: {
      firstName: 'Mireille',
      lastName: 'Ntumba',
      gender: Gender.FEMALE,
      email: 'leader@shiddukim.test',
      phone: '+243800000001',
      status: MemberStatus.ACTIVATED,
      communityId: limete.id,
    },
    create: {
      memberCode: 'SHK-2026-00001',
      firstName: 'Mireille',
      lastName: 'Ntumba',
      gender: Gender.FEMALE,
      dateOfBirth: new Date('1990-04-12'),
      placeOfBirth: 'Kinshasa',
      address: 'Avenue Kabinda 14, Q. Mombele, C. Limete, Kinshasa',
      email: 'leader@shiddukim.test',
      phone: '+243800000001',
      baptismDate: new Date('2012-06-10'),
      baptizedBy: 'Pasteur Diyoka Nsanguluja',
      status: MemberStatus.ACTIVATED,
      communityId: limete.id,
    },
  });

  // SHK-2026-00002 — David Bola (MEMBER user, Matete) — has an active marriage dossier
  const david = await prisma.member.upsert({
    where: { memberCode: 'SHK-2026-00002' },
    update: {
      firstName: 'David',
      lastName: 'Bola',
      gender: Gender.MALE,
      email: 'member@shiddukim.test',
      phone: '+243800000002',
      status: MemberStatus.ACTIVATED,
      communityId: matete.id,
    },
    create: {
      memberCode: 'SHK-2026-00002',
      firstName: 'David',
      lastName: 'Bola',
      gender: Gender.MALE,
      dateOfBirth: new Date('1996-09-23'),
      placeOfBirth: 'Kinshasa',
      address: 'Avenue Kasai 7, Q. Kabila, C. Matete, Kinshasa',
      email: 'member@shiddukim.test',
      phone: '+243800000002',
      baptismDate: new Date('2015-03-22'),
      baptizedBy: 'Pasteur Diyoka Nsanguluja',
      status: MemberStatus.ACTIVATED,
      communityId: matete.id,
    },
  });

  // SHK-2026-00003 — Sarah Malu (Lingwala) — has a submitted marriage dossier
  const sarah = await prisma.member.upsert({
    where: { memberCode: 'SHK-2026-00003' },
    update: {
      firstName: 'Sarah',
      lastName: 'Malu',
      gender: Gender.FEMALE,
      email: 'sarah.malu@shiddukim.test',
      phone: '+243800000003',
      status: MemberStatus.ACTIVATED,
      communityId: lingwala.id,
    },
    create: {
      memberCode: 'SHK-2026-00003',
      firstName: 'Sarah',
      lastName: 'Malu',
      gender: Gender.FEMALE,
      dateOfBirth: new Date('1994-01-15'),
      placeOfBirth: 'Lubumbashi',
      address: 'Avenue des Huileries 21, Q. Kauka, C. Kalamu, Kinshasa',
      email: 'sarah.malu@shiddukim.test',
      phone: '+243800000003',
      baptismDate: new Date('2018-11-04'),
      baptizedBy: 'Pasteur Diyoka Nsanguluja',
      status: MemberStatus.ACTIVATED,
      communityId: lingwala.id,
    },
  });

  // SHK-2026-00004 — Emmanuel Kabongo (MEMBER user, Kintambo) — APPROVED GREEN dossier
  const emmanuel = await prisma.member.upsert({
    where: { memberCode: 'SHK-2026-00004' },
    update: {
      firstName: 'Emmanuel',
      lastName: 'Kabongo',
      gender: Gender.MALE,
      email: 'member2@shiddukim.test',
      phone: '+243800000004',
      status: MemberStatus.ACTIVATED,
      communityId: kintambo.id,
    },
    create: {
      memberCode: 'SHK-2026-00004',
      firstName: 'Emmanuel',
      lastName: 'Kabongo',
      gender: Gender.MALE,
      dateOfBirth: new Date('1993-07-08'),
      placeOfBirth: 'Mbuji-Mayi',
      address:
        'Avenue Poids Lourds 38, Q. Kintambo Magasin, C. Kintambo, Kinshasa',
      email: 'member2@shiddukim.test',
      phone: '+243800000004',
      baptismDate: new Date('2013-08-17'),
      baptizedBy: 'Pasteur Diyoka Nsanguluja',
      status: MemberStatus.ACTIVATED,
      communityId: kintambo.id,
    },
  });

  // SHK-2026-00005 — Jonas Tshibangu (MEMBER user, Kalamu) — COUNSELING dossier
  const jonas = await prisma.member.upsert({
    where: { memberCode: 'SHK-2026-00005' },
    update: {
      firstName: 'Jonas',
      lastName: 'Tshibangu',
      gender: Gender.MALE,
      email: 'member3@shiddukim.test',
      phone: '+243800000005',
      status: MemberStatus.ACTIVATED,
      communityId: kalamu.id,
    },
    create: {
      memberCode: 'SHK-2026-00005',
      firstName: 'Jonas',
      lastName: 'Tshibangu',
      gender: Gender.MALE,
      dateOfBirth: new Date('1991-11-30'),
      placeOfBirth: 'Kinshasa',
      address: 'Avenue Bokassa 5, Q. Matonge, C. Kalamu, Kinshasa',
      email: 'member3@shiddukim.test',
      phone: '+243800000005',
      baptismDate: new Date('2016-04-03'),
      baptizedBy: 'Pasteur Alain Mwika',
      status: MemberStatus.ACTIVATED,
      communityId: kalamu.id,
    },
  });

  // SHK-2026-00006 — Grâce Lukusa (F, Limete) — no user account, managed by secretary
  const grace = await prisma.member.upsert({
    where: { memberCode: 'SHK-2026-00006' },
    update: {
      firstName: 'Grâce',
      lastName: 'Lukusa',
      gender: Gender.FEMALE,
      phone: '+243800000006',
      status: MemberStatus.ACTIVATED,
      communityId: limete.id,
    },
    create: {
      memberCode: 'SHK-2026-00006',
      firstName: 'Grâce',
      lastName: 'Lukusa',
      gender: Gender.FEMALE,
      dateOfBirth: new Date('1997-03-19'),
      placeOfBirth: 'Kinshasa',
      address: 'Avenue Kabinda 9, Q. Mombele, C. Limete, Kinshasa',
      phone: '+243800000006',
      baptismDate: new Date('2020-01-19'),
      baptizedBy: 'Pasteur Diyoka Nsanguluja',
      status: MemberStatus.ACTIVATED,
      communityId: limete.id,
    },
  });

  // SHK-2026-00007 — Pierre Mutombo (M, Matete) — DRAFT dossier, no user account
  const pierre = await prisma.member.upsert({
    where: { memberCode: 'SHK-2026-00007' },
    update: {
      firstName: 'Pierre',
      lastName: 'Mutombo',
      gender: Gender.MALE,
      phone: '+243800000007',
      status: MemberStatus.ACTIVATED,
      communityId: matete.id,
    },
    create: {
      memberCode: 'SHK-2026-00007',
      firstName: 'Pierre',
      lastName: 'Mutombo',
      gender: Gender.MALE,
      dateOfBirth: new Date('1989-06-25'),
      placeOfBirth: 'Kolwezi',
      address: 'Avenue Kasai 55, Q. Kabila, C. Matete, Kinshasa',
      phone: '+243800000007',
      baptismDate: new Date('2010-12-05'),
      baptizedBy: 'Pasteur Diyoka Nsanguluja',
      status: MemberStatus.ACTIVATED,
      communityId: matete.id,
    },
  });

  // SHK-2026-00008 — Augustin Mwamba (M, Lingwala) — REJECTED RED dossier
  const augustin = await prisma.member.upsert({
    where: { memberCode: 'SHK-2026-00008' },
    update: {
      firstName: 'Augustin',
      lastName: 'Mwamba',
      gender: Gender.MALE,
      phone: '+243800000008',
      status: MemberStatus.ACTIVATED,
      communityId: lingwala.id,
    },
    create: {
      memberCode: 'SHK-2026-00008',
      firstName: 'Augustin',
      lastName: 'Mwamba',
      gender: Gender.MALE,
      dateOfBirth: new Date('1987-02-14'),
      placeOfBirth: 'Kinshasa',
      address: 'Avenue des Huileries 62, Q. Bandalungwa, C. Lingwala, Kinshasa',
      phone: '+243800000008',
      baptismDate: new Date('2008-09-28'),
      baptizedBy: 'Pasteur Alain Mwika',
      status: MemberStatus.ACTIVATED,
      communityId: lingwala.id,
    },
  });

  // SHK-2026-00009 — Cécile Banza (F, Kintambo) — SUSPENDED member
  await prisma.member.upsert({
    where: { memberCode: 'SHK-2026-00009' },
    update: {
      firstName: 'Cécile',
      lastName: 'Banza',
      gender: Gender.FEMALE,
      phone: '+243800000009',
      status: MemberStatus.SUSPENDED,
      communityId: kintambo.id,
    },
    create: {
      memberCode: 'SHK-2026-00009',
      firstName: 'Cécile',
      lastName: 'Banza',
      gender: Gender.FEMALE,
      dateOfBirth: new Date('2000-10-11'),
      placeOfBirth: 'Goma',
      address:
        'Avenue Poids Lourds 17, Q. Kintambo Magasin, C. Kintambo, Kinshasa',
      phone: '+243800000009',
      baptismDate: new Date('2022-05-22'),
      baptizedBy: 'Pasteur Diyoka Nsanguluja',
      status: MemberStatus.SUSPENDED,
      communityId: kintambo.id,
    },
  });

  // SHK-2026-00010 — Nathan Lukoki (MEMBER user, Kalamu)
  //   No marriage request — log in as member4@shiddukim.test to test the new form.
  const nathan = await prisma.member.upsert({
    where: { memberCode: 'SHK-2026-00010' },
    update: {
      firstName: 'Nathan',
      lastName: 'Lukoki',
      gender: Gender.MALE,
      email: 'member4@shiddukim.test',
      phone: '+243800000010',
      status: MemberStatus.ACTIVATED,
      communityId: kalamu.id,
    },
    create: {
      memberCode: 'SHK-2026-00010',
      firstName: 'Nathan',
      lastName: 'Lukoki',
      gender: Gender.MALE,
      dateOfBirth: new Date('1998-05-04'),
      placeOfBirth: 'Kinshasa',
      address: 'Avenue Bokassa 18, Q. Matonge, C. Kalamu, Kinshasa',
      email: 'member4@shiddukim.test',
      phone: '+243800000010',
      baptismDate: new Date('2019-07-14'),
      baptizedBy: 'Pasteur Diyoka Nsanguluja',
      status: MemberStatus.ACTIVATED,
      communityId: kalamu.id,
    },
  });

  // ── Community presidents ───────────────────────────────────────────────────────
  await prisma.community.update({
    where: { id: limete.id },
    data: { presidentMemberId: mireille.id },
  });

  // ── User → Member links ───────────────────────────────────────────────────────
  for (const [userId, memberId] of [
    [users.leader.id, mireille.id],
    [users.member1.id, david.id],
    [users.member2.id, emmanuel.id],
    [users.member3.id, jonas.id],
    [users.member4.id, nathan.id],
  ] as [string, string][]) {
    await prisma.userMemberLink.upsert({
      where: { userId_memberId: { userId, memberId } },
      update: { verifiedAt: new Date() },
      create: { userId, memberId, verifiedAt: new Date() },
    });
  }

  // ── Marriage requests ─────────────────────────────────────────────────────────
  //
  // MAR-2026-00001  David Bola + Esther Zagabe
  //   Status: UNDER_REVIEW  |  Classification: ORANGE
  //   Why ORANGE: familles pas encore rencontrées, parents de la fiancée
  //               pas encore au courant.
  const mar1 = await prisma.marriageRequest.upsert({
    where: { requestCode: 'MAR-2026-00001' },
    update: {
      memberId: david.id,
      spouseFullName: 'Esther Zagabe',
      spousePhone: '+243900001002',
      spouseEmail: 'esther.zagabe@shiddukim.test',
      intendedMarriageDate: new Date('2026-09-12'),
      status: MarriageRequestStatus.UNDER_REVIEW,
      classification: MarriageClassification.ORANGE,
      pastorNotes:
        'Prévoir un entretien pastoral complémentaire. Les familles ne se sont pas encore rencontrées et les parents de la fiancée ne sont pas au courant. À suivre.',
      submittedAt: new Date('2026-05-10T10:00:00Z'),
      reviewedAt: new Date('2026-05-22T14:30:00Z'),
      // Questionnaire
      hasSpokenToSpouse: true,
      hasSpokenToSpouseSince: 'Depuis environ 2 mois',
      hasContactWithSpouse: true,
      parentsAware: true,
      spouseParentsAware: false,
      parentsKnowSpouse: true,
      parentsApprove: true,
      familiesMet: false,
      familiesMetSince: null,
      hasKissed: true,
      hasPhysicalContact: false,
      hasBeenIntimate: false,
      intimacyCount: null,
    },
    create: {
      requestCode: 'MAR-2026-00001',
      memberId: david.id,
      spouseFullName: 'Esther Zagabe',
      spousePhone: '+243900001002',
      spouseEmail: 'esther.zagabe@shiddukim.test',
      intendedMarriageDate: new Date('2026-09-12'),
      status: MarriageRequestStatus.UNDER_REVIEW,
      classification: MarriageClassification.ORANGE,
      pastorNotes:
        'Prévoir un entretien pastoral complémentaire. Les familles ne se sont pas encore rencontrées et les parents de la fiancée ne sont pas au courant. À suivre.',
      submittedAt: new Date('2026-05-10T10:00:00Z'),
      reviewedAt: new Date('2026-05-22T14:30:00Z'),
      hasSpokenToSpouse: true,
      hasSpokenToSpouseSince: 'Depuis environ 2 mois',
      hasContactWithSpouse: true,
      parentsAware: true,
      spouseParentsAware: false,
      parentsKnowSpouse: true,
      parentsApprove: true,
      familiesMet: false,
      familiesMetSince: null,
      hasKissed: true,
      hasPhysicalContact: false,
      hasBeenIntimate: false,
      intimacyCount: null,
    },
  });

  //
  // MAR-2026-00002  Sarah Malu + Daniel Mbuyu
  //   Status: SUBMITTED  |  Classification: null (not yet reviewed)
  //   Why clean: toutes les réponses sont favorables — attente de revue pastorale.
  const mar2 = await prisma.marriageRequest.upsert({
    where: { requestCode: 'MAR-2026-00002' },
    update: {
      memberId: sarah.id,
      spouseFullName: 'Daniel Mbuyu',
      spousePhone: '+243900001003',
      spouseEmail: 'daniel.mbuyu@shiddukim.test',
      intendedMarriageDate: new Date('2026-11-07'),
      status: MarriageRequestStatus.SUBMITTED,
      submittedAt: new Date('2026-05-18T09:15:00Z'),
      hasSpokenToSpouse: true,
      hasSpokenToSpouseSince: 'Depuis 4 mois',
      hasContactWithSpouse: true,
      parentsAware: true,
      spouseParentsAware: true,
      parentsKnowSpouse: true,
      parentsApprove: true,
      familiesMet: true,
      familiesMetSince: "Il y a 3 mois, lors d'une réunion de famille",
      hasKissed: false,
      hasPhysicalContact: false,
      hasBeenIntimate: false,
      intimacyCount: null,
    },
    create: {
      requestCode: 'MAR-2026-00002',
      memberId: sarah.id,
      spouseFullName: 'Daniel Mbuyu',
      spousePhone: '+243900001003',
      spouseEmail: 'daniel.mbuyu@shiddukim.test',
      intendedMarriageDate: new Date('2026-11-07'),
      status: MarriageRequestStatus.SUBMITTED,
      submittedAt: new Date('2026-05-18T09:15:00Z'),
      hasSpokenToSpouse: true,
      hasSpokenToSpouseSince: 'Depuis 4 mois',
      hasContactWithSpouse: true,
      parentsAware: true,
      spouseParentsAware: true,
      parentsKnowSpouse: true,
      parentsApprove: true,
      familiesMet: true,
      familiesMetSince: "Il y a 3 mois, lors d'une réunion de famille",
      hasKissed: false,
      hasPhysicalContact: false,
      hasBeenIntimate: false,
      intimacyCount: null,
    },
  });

  //
  // MAR-2026-00003  Emmanuel Kabongo + Prisca Lenda
  //   Status: APPROVED  |  Classification: GREEN
  //   Why GREEN: dossier exemplaire — familles se connaissent depuis longtemps,
  //              deux familles réconciliées, aucune intimité physique.
  const mar3 = await prisma.marriageRequest.upsert({
    where: { requestCode: 'MAR-2026-00003' },
    update: {
      memberId: emmanuel.id,
      spouseFullName: 'Prisca Lenda',
      spousePhone: '+243900001004',
      intendedMarriageDate: new Date('2026-08-30'),
      status: MarriageRequestStatus.APPROVED,
      classification: MarriageClassification.GREEN,
      pastorNotes:
        'Dossier complet et exemplaire. Les deux familles se connaissent de longue date. Accord total des deux côtés. Aucune intimité physique déclarée. Approbation pastorale accordée.',
      submittedAt: new Date('2026-04-15T08:00:00Z'),
      reviewedAt: new Date('2026-05-05T11:00:00Z'),
      hasSpokenToSpouse: true,
      hasSpokenToSpouseSince: 'Depuis 6 mois',
      hasContactWithSpouse: true,
      parentsAware: true,
      spouseParentsAware: true,
      parentsKnowSpouse: true,
      parentsApprove: true,
      familiesMet: true,
      familiesMetSince: 'Il y a 4 mois — visite officielle organisée',
      hasKissed: false,
      hasPhysicalContact: false,
      hasBeenIntimate: false,
      intimacyCount: null,
    },
    create: {
      requestCode: 'MAR-2026-00003',
      memberId: emmanuel.id,
      spouseFullName: 'Prisca Lenda',
      spousePhone: '+243900001004',
      intendedMarriageDate: new Date('2026-08-30'),
      status: MarriageRequestStatus.APPROVED,
      classification: MarriageClassification.GREEN,
      pastorNotes:
        'Dossier complet et exemplaire. Les deux familles se connaissent de longue date. Accord total des deux côtés. Aucune intimité physique déclarée. Approbation pastorale accordée.',
      submittedAt: new Date('2026-04-15T08:00:00Z'),
      reviewedAt: new Date('2026-05-05T11:00:00Z'),
      hasSpokenToSpouse: true,
      hasSpokenToSpouseSince: 'Depuis 6 mois',
      hasContactWithSpouse: true,
      parentsAware: true,
      spouseParentsAware: true,
      parentsKnowSpouse: true,
      parentsApprove: true,
      familiesMet: true,
      familiesMetSince: 'Il y a 4 mois — visite officielle organisée',
      hasKissed: false,
      hasPhysicalContact: false,
      hasBeenIntimate: false,
      intimacyCount: null,
    },
  });

  //
  // MAR-2026-00004  Jonas Tshibangu + Aimée Bondo
  //   Status: COUNSELING  |  Classification: ORANGE
  //   Why ORANGE: parents du garçon ne connaissent pas la fille, familles
  //               pas rencontrées, contact physique déclaré — suivi en cours.
  const mar4 = await prisma.marriageRequest.upsert({
    where: { requestCode: 'MAR-2026-00004' },
    update: {
      memberId: jonas.id,
      spouseFullName: 'Aimée Bondo',
      spousePhone: '+243900001005',
      intendedMarriageDate: new Date('2027-01-20'),
      status: MarriageRequestStatus.COUNSELING,
      classification: MarriageClassification.ORANGE,
      pastorNotes:
        'Les parents du demandeur ne connaissent pas encore la fiancée. Les deux familles ne se sont pas encore rencontrées. Contact physique déclaré nécessite un accompagnement approfondi. Séances de counseling en cours.',
      submittedAt: new Date('2026-05-01T14:00:00Z'),
      reviewedAt: new Date('2026-05-15T10:00:00Z'),
      hasSpokenToSpouse: true,
      hasSpokenToSpouseSince: 'Depuis 1 an environ',
      hasContactWithSpouse: true,
      parentsAware: true,
      spouseParentsAware: true,
      parentsKnowSpouse: false,
      parentsApprove: null,
      familiesMet: false,
      familiesMetSince: null,
      hasKissed: true,
      hasPhysicalContact: true,
      hasBeenIntimate: false,
      intimacyCount: null,
    },
    create: {
      requestCode: 'MAR-2026-00004',
      memberId: jonas.id,
      spouseFullName: 'Aimée Bondo',
      spousePhone: '+243900001005',
      intendedMarriageDate: new Date('2027-01-20'),
      status: MarriageRequestStatus.COUNSELING,
      classification: MarriageClassification.ORANGE,
      pastorNotes:
        'Les parents du demandeur ne connaissent pas encore la fiancée. Les deux familles ne se sont pas encore rencontrées. Contact physique déclaré nécessite un accompagnement approfondi. Séances de counseling en cours.',
      submittedAt: new Date('2026-05-01T14:00:00Z'),
      reviewedAt: new Date('2026-05-15T10:00:00Z'),
      hasSpokenToSpouse: true,
      hasSpokenToSpouseSince: 'Depuis 1 an environ',
      hasContactWithSpouse: true,
      parentsAware: true,
      spouseParentsAware: true,
      parentsKnowSpouse: false,
      parentsApprove: null,
      familiesMet: false,
      familiesMetSince: null,
      hasKissed: true,
      hasPhysicalContact: true,
      hasBeenIntimate: false,
      intimacyCount: null,
    },
  });

  //
  // MAR-2026-00005  Augustin Mwamba + Béatrice Ngoy
  //   Status: REJECTED  |  Classification: RED
  //   Why RED: intimité sexuelle déclarée, aucun des parents n'est au courant,
  //            familles inconnues l'une de l'autre — dossier rejeté.
  await prisma.marriageRequest.upsert({
    where: { requestCode: 'MAR-2026-00005' },
    update: {
      memberId: augustin.id,
      spouseFullName: 'Béatrice Ngoy',
      spousePhone: '+243900001006',
      intendedMarriageDate: new Date('2026-07-04'),
      status: MarriageRequestStatus.REJECTED,
      classification: MarriageClassification.RED,
      pastorNotes:
        'Dossier rejeté. Intimité sexuelle admise, aucun parent informé des deux côtés, familles ne se connaissent pas. Le demandeur est invité à un processus de restauration pastorale avant toute nouvelle démarche matrimoniale.',
      submittedAt: new Date('2026-05-03T09:00:00Z'),
      reviewedAt: new Date('2026-05-12T16:00:00Z'),
      hasSpokenToSpouse: true,
      hasSpokenToSpouseSince: 'Depuis 3 semaines seulement',
      hasContactWithSpouse: true,
      parentsAware: false,
      spouseParentsAware: false,
      parentsKnowSpouse: false,
      parentsApprove: null,
      familiesMet: false,
      familiesMetSince: null,
      hasKissed: true,
      hasPhysicalContact: true,
      hasBeenIntimate: true,
      intimacyCount: 'Plusieurs fois',
    },
    create: {
      requestCode: 'MAR-2026-00005',
      memberId: augustin.id,
      spouseFullName: 'Béatrice Ngoy',
      spousePhone: '+243900001006',
      intendedMarriageDate: new Date('2026-07-04'),
      status: MarriageRequestStatus.REJECTED,
      classification: MarriageClassification.RED,
      pastorNotes:
        'Dossier rejeté. Intimité sexuelle admise, aucun parent informé des deux côtés, familles ne se connaissent pas. Le demandeur est invité à un processus de restauration pastorale avant toute nouvelle démarche matrimoniale.',
      submittedAt: new Date('2026-05-03T09:00:00Z'),
      reviewedAt: new Date('2026-05-12T16:00:00Z'),
      hasSpokenToSpouse: true,
      hasSpokenToSpouseSince: 'Depuis 3 semaines seulement',
      hasContactWithSpouse: true,
      parentsAware: false,
      spouseParentsAware: false,
      parentsKnowSpouse: false,
      parentsApprove: null,
      familiesMet: false,
      familiesMetSince: null,
      hasKissed: true,
      hasPhysicalContact: true,
      hasBeenIntimate: true,
      intimacyCount: 'Plusieurs fois',
    },
  });

  //
  // MAR-2026-00006  Pierre Mutombo + Sylvie Kalonji
  //   Status: DRAFT — le secrétaire a initié le dossier, questionnaire non encore rempli.
  await prisma.marriageRequest.upsert({
    where: { requestCode: 'MAR-2026-00006' },
    update: {
      memberId: pierre.id,
      spouseFullName: 'Sylvie Kalonji',
      spousePhone: '+243900001007',
      intendedMarriageDate: new Date('2027-03-15'),
      status: MarriageRequestStatus.DRAFT,
    },
    create: {
      requestCode: 'MAR-2026-00006',
      memberId: pierre.id,
      spouseFullName: 'Sylvie Kalonji',
      spousePhone: '+243900001007',
      intendedMarriageDate: new Date('2027-03-15'),
      status: MarriageRequestStatus.DRAFT,
    },
  });

  // ── Appointments ──────────────────────────────────────────────────────────────

  // APT-2026-00001 — David Bola, MARRIAGE_REVIEW, SCHEDULED (lié à MAR-2026-00001)
  await prisma.appointment.upsert({
    where: { appointmentCode: 'APT-2026-00001' },
    update: {
      memberId: david.id,
      pastorId: users.pastor.id,
      marriageRequestId: mar1.id,
      appointmentType: AppointmentType.MARRIAGE_REVIEW,
      status: AppointmentStatus.SCHEDULED,
      scheduledAt: new Date('2026-05-28T15:00:00Z'),
      notes:
        'Premier rendez-vous de revue du dossier matrimonial MAR-2026-00001.',
    },
    create: {
      appointmentCode: 'APT-2026-00001',
      memberId: david.id,
      pastorId: users.pastor.id,
      marriageRequestId: mar1.id,
      appointmentType: AppointmentType.MARRIAGE_REVIEW,
      status: AppointmentStatus.SCHEDULED,
      scheduledAt: new Date('2026-05-28T15:00:00Z'),
      notes:
        'Premier rendez-vous de revue du dossier matrimonial MAR-2026-00001.',
    },
  });

  // APT-2026-00002 — Sarah Malu, PASTORAL_COUNSELING, COMPLETED
  await prisma.appointment.upsert({
    where: { appointmentCode: 'APT-2026-00002' },
    update: {
      memberId: sarah.id,
      pastorId: users.pastor.id,
      marriageRequestId: mar2.id,
      appointmentType: AppointmentType.PASTORAL_COUNSELING,
      status: AppointmentStatus.COMPLETED,
      scheduledAt: new Date('2026-05-21T13:00:00Z'),
      notes:
        'Accompagnement pastoral initial — préparation à la soumission du dossier.',
    },
    create: {
      appointmentCode: 'APT-2026-00002',
      memberId: sarah.id,
      pastorId: users.pastor.id,
      marriageRequestId: mar2.id,
      appointmentType: AppointmentType.PASTORAL_COUNSELING,
      status: AppointmentStatus.COMPLETED,
      scheduledAt: new Date('2026-05-21T13:00:00Z'),
      notes:
        'Accompagnement pastoral initial — préparation à la soumission du dossier.',
    },
  });

  // APT-2026-00003 — Emmanuel Kabongo, MARRIAGE_REVIEW, COMPLETED (dossier APPROVED)
  await prisma.appointment.upsert({
    where: { appointmentCode: 'APT-2026-00003' },
    update: {
      memberId: emmanuel.id,
      pastorId: users.pastor.id,
      marriageRequestId: mar3.id,
      appointmentType: AppointmentType.MARRIAGE_REVIEW,
      status: AppointmentStatus.COMPLETED,
      scheduledAt: new Date('2026-04-28T10:00:00Z'),
      notes:
        'Entretien de revue pastorale — dossier validé et approuvé en séance.',
    },
    create: {
      appointmentCode: 'APT-2026-00003',
      memberId: emmanuel.id,
      pastorId: users.pastor.id,
      marriageRequestId: mar3.id,
      appointmentType: AppointmentType.MARRIAGE_REVIEW,
      status: AppointmentStatus.COMPLETED,
      scheduledAt: new Date('2026-04-28T10:00:00Z'),
      notes:
        'Entretien de revue pastorale — dossier validé et approuvé en séance.',
    },
  });

  // APT-2026-00004 — Jonas Tshibangu, PASTORAL_COUNSELING, SCHEDULED (dossier en COUNSELING)
  await prisma.appointment.upsert({
    where: { appointmentCode: 'APT-2026-00004' },
    update: {
      memberId: jonas.id,
      pastorId: users.pastor.id,
      marriageRequestId: mar4.id,
      appointmentType: AppointmentType.PASTORAL_COUNSELING,
      status: AppointmentStatus.SCHEDULED,
      scheduledAt: new Date('2026-05-30T09:00:00Z'),
      notes:
        'Deuxième séance de counseling — travail sur la relation avec les familles.',
    },
    create: {
      appointmentCode: 'APT-2026-00004',
      memberId: jonas.id,
      pastorId: users.pastor.id,
      marriageRequestId: mar4.id,
      appointmentType: AppointmentType.PASTORAL_COUNSELING,
      status: AppointmentStatus.SCHEDULED,
      scheduledAt: new Date('2026-05-30T09:00:00Z'),
      notes:
        'Deuxième séance de counseling — travail sur la relation avec les familles.',
    },
  });

  // APT-2026-00005 — Jonas Tshibangu, PASTORAL_COUNSELING, COMPLETED (première séance)
  await prisma.appointment.upsert({
    where: { appointmentCode: 'APT-2026-00005' },
    update: {
      memberId: jonas.id,
      pastorId: users.pastor.id,
      marriageRequestId: mar4.id,
      appointmentType: AppointmentType.PASTORAL_COUNSELING,
      status: AppointmentStatus.COMPLETED,
      scheduledAt: new Date('2026-05-17T10:00:00Z'),
      notes:
        'Première séance de counseling — présentation du dossier, points sensibles identifiés.',
    },
    create: {
      appointmentCode: 'APT-2026-00005',
      memberId: jonas.id,
      pastorId: users.pastor.id,
      marriageRequestId: mar4.id,
      appointmentType: AppointmentType.PASTORAL_COUNSELING,
      status: AppointmentStatus.COMPLETED,
      scheduledAt: new Date('2026-05-17T10:00:00Z'),
      notes:
        'Première séance de counseling — présentation du dossier, points sensibles identifiés.',
    },
  });

  // APT-2026-00006 — David Bola, MARRIAGE_REVIEW, RESCHEDULED
  await prisma.appointment.upsert({
    where: { appointmentCode: 'APT-2026-00006' },
    update: {
      memberId: david.id,
      pastorId: users.pastor.id,
      marriageRequestId: mar1.id,
      appointmentType: AppointmentType.MARRIAGE_REVIEW,
      status: AppointmentStatus.RESCHEDULED,
      scheduledAt: new Date('2026-05-14T15:00:00Z'),
      notes:
        'Rendez-vous reporté à la demande du fidèle — indisponibilité professionnelle.',
    },
    create: {
      appointmentCode: 'APT-2026-00006',
      memberId: david.id,
      pastorId: users.pastor.id,
      marriageRequestId: mar1.id,
      appointmentType: AppointmentType.MARRIAGE_REVIEW,
      status: AppointmentStatus.RESCHEDULED,
      scheduledAt: new Date('2026-05-14T15:00:00Z'),
      notes:
        'Rendez-vous reporté à la demande du fidèle — indisponibilité professionnelle.',
    },
  });

  // APT-2026-00007 — Grâce Lukusa, GENERAL, SCHEDULED (rendez-vous général)
  await prisma.appointment.upsert({
    where: { appointmentCode: 'APT-2026-00007' },
    update: {
      memberId: grace.id,
      pastorId: users.pastor.id,
      appointmentType: AppointmentType.GENERAL,
      status: AppointmentStatus.SCHEDULED,
      scheduledAt: new Date('2026-06-03T11:00:00Z'),
      notes: 'Suivi pastoral général — accompagnement spirituel.',
    },
    create: {
      appointmentCode: 'APT-2026-00007',
      memberId: grace.id,
      pastorId: users.pastor.id,
      appointmentType: AppointmentType.GENERAL,
      status: AppointmentStatus.SCHEDULED,
      scheduledAt: new Date('2026-06-03T11:00:00Z'),
      notes: 'Suivi pastoral général — accompagnement spirituel.',
    },
  });

  // ── Summary ───────────────────────────────────────────────────────────────────
  console.log('\nSeed complete.\n');

  console.log(
    '── Comptes utilisateurs ─────────────────────────────────────────',
  );
  console.table([
    {
      rôle: 'SUPER_ADMIN',
      email: 'superadmin@shiddukim.test',
      motDePasse: password,
    },
    {
      rôle: 'CHURCH_ADMIN',
      email: 'admin@shiddukim.test',
      motDePasse: password,
    },
    {
      rôle: 'SECRETARY',
      email: 'secretary@shiddukim.test',
      motDePasse: password,
    },
    { rôle: 'PASTOR', email: 'pastor@shiddukim.test', motDePasse: password },
    {
      rôle: 'COMMUNITY_LEADER',
      email: 'leader@shiddukim.test',
      motDePasse: password,
    },
    {
      rôle: 'MEMBER (David)',
      email: 'member@shiddukim.test',
      motDePasse: password,
    },
    {
      rôle: 'MEMBER (Emmanuel)',
      email: 'member2@shiddukim.test',
      motDePasse: password,
    },
    {
      rôle: 'MEMBER (Jonas)',
      email: 'member3@shiddukim.test',
      motDePasse: password,
    },
    {
      rôle: 'MEMBER (Nathan) ← pas de dossier',
      email: 'member4@shiddukim.test',
      motDePasse: password,
    },
  ]);

  console.log(
    '\n── Dossiers matrimoniaux ─────────────────────────────────────────',
  );
  console.table([
    {
      code: 'MAR-2026-00001',
      demandeur: 'David Bola',
      fiancée: 'Esther Zagabe',
      statut: 'UNDER_REVIEW',
      class: 'ORANGE',
    },
    {
      code: 'MAR-2026-00002',
      demandeur: 'Sarah Malu',
      fiancé: 'Daniel Mbuyu',
      statut: 'SUBMITTED',
      class: '—',
    },
    {
      code: 'MAR-2026-00003',
      demandeur: 'Emmanuel Kabongo',
      fiancée: 'Prisca Lenda',
      statut: 'APPROVED',
      class: 'GREEN',
    },
    {
      code: 'MAR-2026-00004',
      demandeur: 'Jonas Tshibangu',
      fiancée: 'Aimée Bondo',
      statut: 'COUNSELING',
      class: 'ORANGE',
    },
    {
      code: 'MAR-2026-00005',
      demandeur: 'Augustin Mwamba',
      fiancée: 'Béatrice Ngoy',
      statut: 'REJECTED',
      class: 'RED',
    },
    {
      code: 'MAR-2026-00006',
      demandeur: 'Pierre Mutombo',
      fiancée: 'Sylvie Kalonji',
      statut: 'DRAFT',
      class: '—',
    },
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
