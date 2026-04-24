import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Project, ProjectRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AddProjectMemberDto } from './dto/add-project-member.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { TransferProjectOwnershipDto } from './dto/transfer-project-ownership.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { UpdateProjectMemberRoleDto } from './dto/update-project-member-role.dto';

type ProjectMemberItem = {
  userId: string;
  email: string;
  name: string;
  role: ProjectRole;
  isOwner: boolean;
};

const PROJECT_ROLE_ORDER: Record<ProjectRole, number> = {
  [ProjectRole.OWNER]: 0,
  [ProjectRole.EDITOR]: 1,
  [ProjectRole.VIEWER]: 2,
};

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(ownerId: string, dto: CreateProjectDto): Promise<Project> {
    return this.prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          name: dto.name,
          description: dto.description,
          i18nPattern: dto.i18nPattern,
          ownerId,
        },
      });

      await tx.projectMember.create({
        data: {
          projectId: project.id,
          userId: ownerId,
          role: ProjectRole.OWNER,
        },
      });

      return project;
    });
  }

  async listForUser(userId: string): Promise<Project[]> {
    return this.prisma.project.findMany({
      where: {
        OR: [{ ownerId: userId }, { members: { some: { userId } } }],
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getById(id: string): Promise<Project> {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return project;
  }

  async update(id: string, dto: UpdateProjectDto): Promise<Project> {
    await this.getById(id);

    return this.prisma.project.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        i18nPattern: dto.i18nPattern,
      },
    });
  }

  async addMember(projectId: string, dto: AddProjectMemberDto) {
    const project = await this.getProjectIdentity(projectId);

    if (dto.role === ProjectRole.OWNER) {
      throw new BadRequestException('OWNER role cannot be assigned as member');
    }

    const normalizedEmail = dto.email.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.id === project.ownerId) {
      throw new BadRequestException('Project owner is already part of the team');
    }

    return this.prisma.projectMember.upsert({
      where: {
        projectId_userId: {
          projectId,
          userId: user.id,
        },
      },
      update: {
        role: dto.role,
      },
      create: {
        projectId,
        userId: user.id,
        role: dto.role,
      },
    });
  }

  async listMembers(projectId: string): Promise<ProjectMemberItem[]> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: {
        ownerId: true,
        members: {
          select: {
            userId: true,
            role: true,
            user: {
              select: {
                email: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const members = project.members.map((member) => {
      const isOwner = member.userId === project.ownerId;

      return {
        userId: member.userId,
        email: member.user.email,
        name: member.user.name,
        role: isOwner ? ProjectRole.OWNER : member.role,
        isOwner,
      };
    });

    members.sort((left, right) => {
      const roleOrder = PROJECT_ROLE_ORDER[left.role] - PROJECT_ROLE_ORDER[right.role];
      if (roleOrder !== 0) {
        return roleOrder;
      }

      return left.name.localeCompare(right.name);
    });

    return members;
  }

  async updateMemberRole(
    projectId: string,
    userId: string,
    dto: UpdateProjectMemberRoleDto,
  ) {
    const project = await this.getProjectIdentity(projectId);

    if (dto.role === ProjectRole.OWNER) {
      throw new BadRequestException('OWNER role cannot be assigned in this endpoint');
    }

    if (userId === project.ownerId) {
      throw new BadRequestException('Use ownership transfer endpoint to change owner role');
    }

    const membership = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
      select: {
        id: true,
      },
    });

    if (!membership) {
      throw new NotFoundException('Project member not found');
    }

    return this.prisma.projectMember.update({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
      data: {
        role: dto.role,
      },
    });
  }

  async removeMember(projectId: string, userId: string) {
    const project = await this.getProjectIdentity(projectId);

    if (userId === project.ownerId) {
      throw new BadRequestException('Project owner cannot be removed');
    }

    const deletion = await this.prisma.projectMember.deleteMany({
      where: {
        projectId,
        userId,
      },
    });

    if (deletion.count === 0) {
      throw new NotFoundException('Project member not found');
    }

    return { deleted: true };
  }

  async leaveProject(projectId: string, userId: string) {
    const project = await this.getProjectIdentity(projectId);

    if (userId === project.ownerId) {
      throw new BadRequestException('Project owner must transfer ownership before leaving');
    }

    const deletion = await this.prisma.projectMember.deleteMany({
      where: {
        projectId,
        userId,
      },
    });

    if (deletion.count === 0) {
      throw new NotFoundException('Project member not found');
    }

    return { left: true };
  }

  async transferOwnership(
    projectId: string,
    currentOwnerId: string,
    dto: TransferProjectOwnershipDto,
  ) {
    const project = await this.getProjectIdentity(projectId);

    if (project.ownerId !== currentOwnerId) {
      throw new ForbiddenException('Only owner can transfer ownership');
    }

    if (dto.newOwnerUserId === currentOwnerId) {
      throw new BadRequestException('New owner must be a different user');
    }

    const targetMembership = await this.prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: dto.newOwnerUserId,
        },
      },
      select: {
        id: true,
      },
    });

    if (!targetMembership) {
      throw new NotFoundException('New owner must be an existing project member');
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedProject = await tx.project.update({
        where: {
          id: projectId,
        },
        data: {
          ownerId: dto.newOwnerUserId,
        },
      });

      await tx.projectMember.upsert({
        where: {
          projectId_userId: {
            projectId,
            userId: dto.newOwnerUserId,
          },
        },
        update: {
          role: ProjectRole.OWNER,
        },
        create: {
          projectId,
          userId: dto.newOwnerUserId,
          role: ProjectRole.OWNER,
        },
      });

      await tx.projectMember.upsert({
        where: {
          projectId_userId: {
            projectId,
            userId: currentOwnerId,
          },
        },
        update: {
          role: ProjectRole.EDITOR,
        },
        create: {
          projectId,
          userId: currentOwnerId,
          role: ProjectRole.EDITOR,
        },
      });

      return updatedProject;
    });
  }

  async remove(id: string) {
    await this.getById(id);

    await this.prisma.project.delete({
      where: { id },
    });

    return { deleted: true };
  }

  private async getProjectIdentity(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: {
        id: projectId,
      },
      select: {
        id: true,
        ownerId: true,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return project;
  }
}
