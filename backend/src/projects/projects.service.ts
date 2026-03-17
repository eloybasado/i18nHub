import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Project, ProjectRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AddProjectMemberDto } from './dto/add-project-member.dto';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

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
    await this.getById(projectId);

    if (dto.role === ProjectRole.OWNER) {
      throw new BadRequestException('OWNER role cannot be assigned as member');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.projectMember.upsert({
      where: {
        projectId_userId: {
          projectId,
          userId: dto.userId,
        },
      },
      update: {
        role: dto.role,
      },
      create: {
        projectId,
        userId: dto.userId,
        role: dto.role,
      },
    });
  }

  async remove(id: string) {
    await this.getById(id);

    await this.prisma.project.delete({
      where: { id },
    });

    return { deleted: true };
  }
}
