import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import * as QRCode from 'qrcode';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../common/constants/audit-actions';
import type { CreateMemberDto } from './dto/create-member.dto';
import type { UpdateMemberDto } from './dto/update-member.dto';
import type { QueryMembersDto } from './dto/query-members.dto';
import type { RequestContext } from '../auth/auth.service';
import type { Prisma } from '../../generated/prisma/client.js';

// ─── Response shape (never exposes database id) ───────────────────────────────

export interface MemberResponse {
  memberCode: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  gender: string | null;
  dateOfBirth: string | null;
  placeOfBirth: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  communityId: string | null;
  baptismDate: string | null;
  baptizedBy: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface DuplicateWarning {
  field: 'name+dateOfBirth' | 'phone' | 'email';
  memberCode: string;
  message: string;
}

export interface CreateMemberResult {
  member: MemberResponse;
  duplicateWarnings: DuplicateWarning[];
}

export interface PaginatedMembers {
  data: MemberResponse[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class MembersService {
  private readonly logger = new Logger(MembersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ── Create ─────────────────────────────────────────────────────────────────

  async create(
    dto: CreateMemberDto,
    actorUserId: string,
    ctx?: RequestContext,
  ): Promise<CreateMemberResult> {
    // 1. Check for duplicates (soft warning — not a hard block)
    const duplicateWarnings = await this.detectDuplicates(dto);

    // 2. Generate unique member code (SHK-YYYY-NNNNN)
    const memberCode = await this.generateMemberCode();

    // 3. Persist the member record
    const member = await this.prisma.member.create({
      data: {
        memberCode,
        firstName: dto.firstName,
        middleName: dto.middleName ?? null,
        lastName: dto.lastName,
        gender: dto.gender ?? null,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
        placeOfBirth: dto.placeOfBirth ?? null,
        address: dto.address ?? null,
        phone: dto.phone ?? null,
        email: dto.email ?? null,
        communityId: dto.communityId ?? null,
        baptismDate: dto.baptismDate ? new Date(dto.baptismDate) : null,
        baptizedBy: dto.baptizedBy ?? null,
      },
    });

    // 4. Audit — fire-and-forget
    this.audit.log({
      actorUserId,
      action: AuditAction.MEMBER.CREATED,
      entityType: 'Member',
      entityId: member.memberCode,
      metadata: {
        memberCode: member.memberCode,
        firstName: member.firstName,
        lastName: member.lastName,
        communityId: member.communityId,
        hasDuplicateWarnings: duplicateWarnings.length > 0,
      },
      ipAddress: ctx?.ipAddress,
      userAgent: ctx?.userAgent,
    });

    return {
      member: this.toResponse(member),
      duplicateWarnings,
    };
  }

  // ── List ───────────────────────────────────────────────────────────────────

  async findAll(query: QueryMembersDto): Promise<PaginatedMembers> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    // Build dynamic WHERE clause
    const where: Prisma.MemberWhereInput = {};

    if (query.firstName) {
      where.firstName = { contains: query.firstName, mode: 'insensitive' };
    }
    if (query.lastName) {
      where.lastName = { contains: query.lastName, mode: 'insensitive' };
    }
    if (query.memberCode) {
      where.memberCode = query.memberCode;
    }
    if (query.communityId) {
      where.communityId = query.communityId;
    }

    const [members, total] = await Promise.all([
      this.prisma.member.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      }),
      this.prisma.member.count({ where }),
    ]);

    return {
      data: members.map((m) => this.toResponse(m)),
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    };
  }

  // ── Find one by public code ────────────────────────────────────────────────

  async findByCode(memberCode: string): Promise<MemberResponse> {
    const member = await this.prisma.member.findUnique({
      where: { memberCode },
    });
    if (!member) {
      throw new NotFoundException(
        `Aucun fidèle trouvé avec le code ${memberCode}.`,
      );
    }
    return this.toResponse(member);
  }

  // ── Update (basic fields only — no baptism data) ──────────────────────────

  async update(
    memberCode: string,
    dto: UpdateMemberDto,
    actorUserId: string,
    ctx?: RequestContext,
  ): Promise<MemberResponse> {
    const existing = await this.prisma.member.findUnique({
      where: { memberCode },
    });
    if (!existing) {
      throw new NotFoundException(
        `Aucun fidèle trouvé avec le code ${memberCode}.`,
      );
    }

    // Collect changed fields for the audit log
    const changedFields: Record<string, { from: unknown; to: unknown }> = {};

    const updateData: Record<string, unknown> = {};

    if (dto.firstName !== undefined && dto.firstName !== existing.firstName) {
      changedFields['firstName'] = {
        from: existing.firstName,
        to: dto.firstName,
      };
      updateData['firstName'] = dto.firstName;
    }
    if (
      dto.middleName !== undefined &&
      dto.middleName !== existing.middleName
    ) {
      changedFields['middleName'] = {
        from: existing.middleName,
        to: dto.middleName,
      };
      updateData['middleName'] = dto.middleName;
    }
    if (dto.lastName !== undefined && dto.lastName !== existing.lastName) {
      changedFields['lastName'] = {
        from: existing.lastName,
        to: dto.lastName,
      };
      updateData['lastName'] = dto.lastName;
    }
    if (dto.gender !== undefined && dto.gender !== existing.gender) {
      changedFields['gender'] = { from: existing.gender, to: dto.gender };
      updateData['gender'] = dto.gender;
    }
    if (dto.dateOfBirth !== undefined) {
      const newDate = new Date(dto.dateOfBirth);
      if (
        !existing.dateOfBirth ||
        newDate.toISOString() !== existing.dateOfBirth.toISOString()
      ) {
        changedFields['dateOfBirth'] = {
          from: existing.dateOfBirth?.toISOString() ?? null,
          to: dto.dateOfBirth,
        };
        updateData['dateOfBirth'] = newDate;
      }
    }
    if (
      dto.placeOfBirth !== undefined &&
      dto.placeOfBirth !== existing.placeOfBirth
    ) {
      changedFields['placeOfBirth'] = {
        from: existing.placeOfBirth,
        to: dto.placeOfBirth,
      };
      updateData['placeOfBirth'] = dto.placeOfBirth;
    }
    if (dto.address !== undefined && dto.address !== existing.address) {
      changedFields['address'] = { from: existing.address, to: dto.address };
      updateData['address'] = dto.address;
    }
    if (dto.phone !== undefined && dto.phone !== existing.phone) {
      changedFields['phone'] = { from: existing.phone, to: dto.phone };
      updateData['phone'] = dto.phone;
    }
    if (dto.email !== undefined && dto.email !== existing.email) {
      changedFields['email'] = { from: existing.email, to: dto.email };
      updateData['email'] = dto.email;
    }

    // No-op if nothing changed
    if (Object.keys(updateData).length === 0) {
      return this.toResponse(existing);
    }

    const updated = await this.prisma.member.update({
      where: { memberCode },
      data: updateData,
    });

    // Audit — fire-and-forget, include changed fields in metadata
    this.audit.log({
      actorUserId,
      action: AuditAction.MEMBER.UPDATED,
      entityType: 'Member',
      entityId: memberCode,
      metadata: { changedFields },
      ipAddress: ctx?.ipAddress,
      userAgent: ctx?.userAgent,
    });

    return this.toResponse(updated);
  }

  // ── QR code ────────────────────────────────────────────────────────────────

  /**
   * Returns the member's QR code as a base64-encoded PNG data URL.
   * The QR code content is the memberCode (e.g. "SHK-2026-00001").
   */
  async getQrCode(memberCode: string): Promise<string> {
    // Ensure the member exists before generating
    const exists = await this.prisma.member.findUnique({
      where: { memberCode },
      select: { memberCode: true },
    });
    if (!exists) {
      throw new NotFoundException(
        `Aucun fidèle trouvé avec le code ${memberCode}.`,
      );
    }

    // Generate QR code as base64 data URL (PNG)
    const dataUrl = await QRCode.toDataURL(memberCode, {
      errorCorrectionLevel: 'M',
      width: 300,
      margin: 2,
    });

    return dataUrl;
  }

  // ── Member code generation ─────────────────────────────────────────────────

  /**
   * Generates a unique member code in the format SHK-YYYY-NNNNN.
   *
   * Strategy:
   *   1. Find the highest existing sequence number for the current year.
   *   2. Increment by 1 and format as a zero-padded 5-digit number.
   *   3. Retry up to 3 times on unique constraint violation (race condition).
   *
   * Example: SHK-2026-00001, SHK-2026-00002, …, SHK-2026-99999
   */
  private async generateMemberCode(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `SHK-${year}-`;

    for (let attempt = 0; attempt < 3; attempt++) {
      // Find the member with the highest code for this year
      const last = await this.prisma.member.findFirst({
        where: { memberCode: { startsWith: prefix } },
        orderBy: { memberCode: 'desc' },
        select: { memberCode: true },
      });

      let nextSeq = 1;
      if (last) {
        // Extract the numeric suffix (last 5 chars) and increment
        const suffix = last.memberCode.slice(prefix.length);
        nextSeq = parseInt(suffix, 10) + 1;
      }

      const candidate = `${prefix}${String(nextSeq).padStart(5, '0')}`;

      // Check for existence (guards against race conditions during generation)
      const collision = await this.prisma.member.findUnique({
        where: { memberCode: candidate },
        select: { memberCode: true },
      });

      if (!collision) {
        return candidate;
      }

      // Collision detected — retry with incremented sequence
      this.logger.warn(
        `Collision de code membre détectée pour ${candidate}, nouvelle tentative ${attempt + 1}/3`,
      );
    }

    // Extremely unlikely but safe fallback — add a timestamp suffix
    const fallback = `${prefix}${Date.now()}`;
    this.logger.error(
      `Impossible de générer un code unique après 3 tentatives — fallback: ${fallback}`,
    );
    return fallback;
  }

  // ── Duplicate detection ────────────────────────────────────────────────────

  /**
   * Checks for potential duplicate members on three signals:
   *   1. Same firstName + lastName + dateOfBirth
   *   2. Same phone number
   *   3. Same email address
   *
   * Returns warnings (soft — not a hard block) so the UI can prompt for
   * confirmation before saving.
   */
  private async detectDuplicates(
    dto: CreateMemberDto,
  ): Promise<DuplicateWarning[]> {
    const warnings: DuplicateWarning[] = [];

    // Check 1: name + date of birth combination
    if (dto.dateOfBirth) {
      const nameDobMatch = await this.prisma.member.findFirst({
        where: {
          firstName: { equals: dto.firstName, mode: 'insensitive' },
          lastName: { equals: dto.lastName, mode: 'insensitive' },
          dateOfBirth: new Date(dto.dateOfBirth),
        },
        select: { memberCode: true },
      });
      if (nameDobMatch) {
        warnings.push({
          field: 'name+dateOfBirth',
          memberCode: nameDobMatch.memberCode,
          message: `Un fidèle avec le même nom et la même date de naissance existe déjà (${nameDobMatch.memberCode}).`,
        });
      }
    }

    // Check 2: phone number
    if (dto.phone) {
      const phoneMatch = await this.prisma.member.findFirst({
        where: { phone: dto.phone },
        select: { memberCode: true },
      });
      if (phoneMatch) {
        warnings.push({
          field: 'phone',
          memberCode: phoneMatch.memberCode,
          message: `Ce numéro de téléphone est déjà utilisé par le fidèle ${phoneMatch.memberCode}.`,
        });
      }
    }

    // Check 3: email address
    if (dto.email) {
      const emailMatch = await this.prisma.member.findFirst({
        where: { email: { equals: dto.email, mode: 'insensitive' } },
        select: { memberCode: true },
      });
      if (emailMatch) {
        warnings.push({
          field: 'email',
          memberCode: emailMatch.memberCode,
          message: `Cette adresse e-mail est déjà utilisée par le fidèle ${emailMatch.memberCode}.`,
        });
      }
    }

    return warnings;
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  /**
   * Maps a Prisma Member record to a safe API response shape.
   * Never exposes the internal database `id` field.
   */
  private toResponse(member: {
    memberCode: string;
    firstName: string;
    middleName: string | null;
    lastName: string;
    gender: string | null;
    dateOfBirth: Date | null;
    placeOfBirth: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
    communityId: string | null;
    baptismDate: Date | null;
    baptizedBy: string | null;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  }): MemberResponse {
    return {
      memberCode: member.memberCode,
      firstName: member.firstName,
      middleName: member.middleName,
      lastName: member.lastName,
      gender: member.gender,
      dateOfBirth: member.dateOfBirth?.toISOString() ?? null,
      placeOfBirth: member.placeOfBirth,
      address: member.address,
      phone: member.phone,
      email: member.email,
      communityId: member.communityId,
      baptismDate: member.baptismDate?.toISOString() ?? null,
      baptizedBy: member.baptizedBy,
      status: member.status,
      createdAt: member.createdAt.toISOString(),
      updatedAt: member.updatedAt.toISOString(),
    };
  }
}
