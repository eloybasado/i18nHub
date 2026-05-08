import { Injectable, NotFoundException } from '@nestjs/common';
import { type I18nPattern } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProjectDto } from '../projects/dto/update-project.dto';
import { UpdateUserTierDto } from './dto/update-user-tier.dto';

type AdminUserListItem = {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'MEMBER';
  tier: 'FREE' | 'PRO';
  createdAt: Date;
  ownedProjectsCount: number;
  membershipsCount: number;
};

type AdminProjectListItem = {
  id: string;
  name: string;
  description: string | null;
  i18nPattern: I18nPattern;
  ownerId: string;
  createdAt: Date;
  owner: {
    id: string;
    email: string;
    name: string;
    role: 'ADMIN' | 'MEMBER';
    tier: 'FREE' | 'PRO';
  };
  membersCount: number;
  languagesCount: number;
  fileGroupsCount: number;
};

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async listUsers(opts?: { page?: number; perPage?: number; q?: string }) {
    const page = opts?.page ?? 1;
    const perPage = opts?.perPage ?? 20;
    const q = opts?.q?.toLowerCase() ?? undefined;

    const where = q
      ? {
          OR: [{ email: { contains: q } }, { name: { contains: q } }],
        }
      : undefined;

    const [total, users] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: perPage,
        skip: (page - 1) * perPage,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          tier: true,
          createdAt: true,
          _count: {
            select: {
              ownedProjects: true,
              projectMemberships: true,
            },
          },
        },
      }),
    ]);

    const items = users.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tier: user.tier,
      createdAt: user.createdAt,
      ownedProjectsCount: user._count.ownedProjects,
      membershipsCount: user._count.projectMemberships,
    }));

    return { items, total, page, perPage };
  }

  async updateUserTier(
    userId: string,
    dto: UpdateUserTierDto,
  ): Promise<AdminUserListItem> {
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        tier: dto.tier,
        refreshTokenHash: null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        tier: true,
        createdAt: true,
        _count: {
          select: {
            ownedProjects: true,
            projectMemberships: true,
          },
        },
      },
    });

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      role: updatedUser.role,
      tier: updatedUser.tier,
      createdAt: updatedUser.createdAt,
      ownedProjectsCount: updatedUser._count.ownedProjects,
      membershipsCount: updatedUser._count.projectMemberships,
    };
  }

  async listProjects(opts?: { page?: number; perPage?: number; q?: string }) {
    const page = opts?.page ?? 1;
    const perPage = opts?.perPage ?? 20;
    const q = opts?.q?.toLowerCase() ?? undefined;

    const where = q
      ? {
          OR: [{ name: { contains: q } }, { description: { contains: q } }],
        }
      : undefined;

    const [total, projects] = await Promise.all([
      this.prisma.project.count({ where }),
      this.prisma.project.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: perPage,
        skip: (page - 1) * perPage,
        select: {
          id: true,
          name: true,
          description: true,
          i18nPattern: true,
          ownerId: true,
          createdAt: true,
          owner: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true,
              tier: true,
            },
          },
          _count: {
            select: {
              members: true,
              languages: true,
              fileGroups: true,
            },
          },
        },
      }),
    ]);

    const items = projects.map((project) => ({
      id: project.id,
      name: project.name,
      description: project.description,
      i18nPattern: project.i18nPattern,
      ownerId: project.ownerId,
      createdAt: project.createdAt,
      owner: project.owner,
      membersCount: project._count.members,
      languagesCount: project._count.languages,
      fileGroupsCount: project._count.fileGroups,
    }));

    return { items, total, page, perPage };
  }

  async updateProject(
    projectId: string,
    dto: UpdateProjectDto,
  ): Promise<AdminProjectListItem> {
    const existingProject = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });

    if (!existingProject) {
      throw new NotFoundException('Project not found');
    }

    const updatedProject = await this.prisma.project.update({
      where: { id: projectId },
      data: {
        name: dto.name,
        description: dto.description,
        i18nPattern: dto.i18nPattern,
      },
      select: {
        id: true,
        name: true,
        description: true,
        i18nPattern: true,
        ownerId: true,
        createdAt: true,
        owner: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            tier: true,
          },
        },
        _count: {
          select: {
            members: true,
            languages: true,
            fileGroups: true,
          },
        },
      },
    });

    return {
      id: updatedProject.id,
      name: updatedProject.name,
      description: updatedProject.description,
      i18nPattern: updatedProject.i18nPattern,
      ownerId: updatedProject.ownerId,
      createdAt: updatedProject.createdAt,
      owner: updatedProject.owner,
      membersCount: updatedProject._count.members,
      languagesCount: updatedProject._count.languages,
      fileGroupsCount: updatedProject._count.fileGroups,
    };
  }

  async deleteProject(projectId: string) {
    const existingProject = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });

    if (!existingProject) {
      throw new NotFoundException('Project not found');
    }

    await this.prisma.project.delete({
      where: { id: projectId },
    });

    return { deleted: true };
  }
}
