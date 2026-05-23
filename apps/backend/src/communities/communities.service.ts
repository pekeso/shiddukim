import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateCommunityDto } from './dto/create-community.dto';
import type { UpdateCommunityDto } from './dto/update-community.dto';

// ─── Response shapes ──────────────────────────────────────────────────────────

export interface CommunityResponse {
  id: string;
  name: string;
  description: string | null;
  presidentMemberCode: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CommunityWithMemberCount extends CommunityResponse {
  memberCount: number;
}

// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class CommunitiesService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Create ─────────────────────────────────────────────────────────────────

  async create(dto: CreateCommunityDto): Promise<CommunityResponse> {
    // Check for duplicate name
    const existing = await this.prisma.community.findUnique({
      where: { name: dto.name },
    });
    if (existing) {
      throw new ConflictException(
        `Une communauté avec le nom "${dto.name}" existe déjà.`,
      );
    }

    // Resolve presidentMemberId from memberCode (if provided)
    let presidentMemberId: string | null = null;
    if (dto.presidentMemberCode) {
      const president = await this.prisma.member.findUnique({
        where: { memberCode: dto.presidentMemberCode },
        select: { id: true },
      });
      if (!president) {
        throw new NotFoundException(
          `Aucun fidèle trouvé avec le code ${dto.presidentMemberCode}.`,
        );
      }
      presidentMemberId = president.id;
    }

    const community = await this.prisma.community.create({
      data: {
        name: dto.name,
        description: dto.description ?? null,
        presidentMemberId,
      },
      include: { president: { select: { memberCode: true } } },
    });

    return this.toResponse(community);
  }

  // ── List with member count ─────────────────────────────────────────────────

  async findAll(): Promise<CommunityWithMemberCount[]> {
    const communities = await this.prisma.community.findMany({
      orderBy: { name: 'asc' },
      include: {
        president: { select: { memberCode: true } },
        _count: { select: { members: true } },
      },
    });

    return communities.map((c) => ({
      ...this.toResponse(c),
      memberCount: c._count.members,
    }));
  }

  // ── Find one ───────────────────────────────────────────────────────────────

  async findOne(id: string): Promise<CommunityWithMemberCount> {
    const community = await this.prisma.community.findUnique({
      where: { id },
      include: {
        president: { select: { memberCode: true } },
        _count: { select: { members: true } },
      },
    });
    if (!community) {
      throw new NotFoundException(
        `Aucune communauté trouvée avec l'identifiant ${id}.`,
      );
    }
    return {
      ...this.toResponse(community),
      memberCount: community._count.members,
    };
  }

  // ── Update ─────────────────────────────────────────────────────────────────

  async update(
    id: string,
    dto: UpdateCommunityDto,
  ): Promise<CommunityResponse> {
    const existing = await this.prisma.community.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(
        `Aucune communauté trouvée avec l'identifiant ${id}.`,
      );
    }

    // Check name uniqueness if changing name
    if (dto.name && dto.name !== existing.name) {
      const nameTaken = await this.prisma.community.findUnique({
        where: { name: dto.name },
      });
      if (nameTaken) {
        throw new ConflictException(
          `Une communauté avec le nom "${dto.name}" existe déjà.`,
        );
      }
    }

    // Resolve new presidentMemberId from memberCode (if provided)
    let presidentMemberId: string | null | undefined = undefined;
    if (dto.presidentMemberCode !== undefined) {
      if (dto.presidentMemberCode === null || dto.presidentMemberCode === '') {
        presidentMemberId = null;
      } else {
        const president = await this.prisma.member.findUnique({
          where: { memberCode: dto.presidentMemberCode },
          select: { id: true },
        });
        if (!president) {
          throw new NotFoundException(
            `Aucun fidèle trouvé avec le code ${dto.presidentMemberCode}.`,
          );
        }
        presidentMemberId = president.id;
      }
    }

    const updateData: Record<string, unknown> = {};
    if (dto.name !== undefined) updateData['name'] = dto.name;
    if (dto.description !== undefined)
      updateData['description'] = dto.description;
    if (presidentMemberId !== undefined)
      updateData['presidentMemberId'] = presidentMemberId;

    const updated = await this.prisma.community.update({
      where: { id },
      data: updateData,
      include: { president: { select: { memberCode: true } } },
    });

    return this.toResponse(updated);
  }

  // ── Assign member to community ─────────────────────────────────────────────

  async assignMember(
    communityId: string,
    memberCode: string,
  ): Promise<{ message: string }> {
    // Verify community exists
    const community = await this.prisma.community.findUnique({
      where: { id: communityId },
      select: { id: true, name: true },
    });
    if (!community) {
      throw new NotFoundException(
        `Aucune communauté trouvée avec l'identifiant ${communityId}.`,
      );
    }

    // Verify member exists
    const member = await this.prisma.member.findUnique({
      where: { memberCode },
      select: { id: true, communityId: true },
    });
    if (!member) {
      throw new NotFoundException(
        `Aucun fidèle trouvé avec le code ${memberCode}.`,
      );
    }

    // Check if already in the same community
    if (member.communityId === communityId) {
      throw new ConflictException(
        `Le fidèle ${memberCode} est déjà membre de cette communauté.`,
      );
    }

    // Assign the member to the community
    await this.prisma.member.update({
      where: { memberCode },
      data: { communityId },
    });

    return {
      message: `Le fidèle ${memberCode} a été assigné à la communauté "${community.name}".`,
    };
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private toResponse(community: {
    id: string;
    name: string;
    description: string | null;
    presidentMemberId: string | null;
    president?: { memberCode: string } | null;
    createdAt: Date;
    updatedAt: Date;
  }): CommunityResponse {
    return {
      id: community.id,
      name: community.name,
      description: community.description,
      presidentMemberCode: community.president?.memberCode ?? null,
      createdAt: community.createdAt.toISOString(),
      updatedAt: community.updatedAt.toISOString(),
    };
  }
}
