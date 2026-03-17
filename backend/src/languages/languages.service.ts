import { Injectable, NotFoundException } from '@nestjs/common';
import { Language } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLanguageDto } from './dto/create-language.dto';
import { UpdateLanguageDto } from './dto/update-language.dto';

@Injectable()
export class LanguagesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(projectId: string, dto: CreateLanguageDto): Promise<Language> {
    await this.ensureProjectExists(projectId);

    return this.prisma.language.create({
      data: {
        projectId,
        code: dto.code.toLowerCase(),
        name: dto.name,
      },
    });
  }

  async listByProject(projectId: string): Promise<Language[]> {
    await this.ensureProjectExists(projectId);

    return this.prisma.language.findMany({
      where: { projectId },
      orderBy: { code: 'asc' },
    });
  }

  async setReferenceLanguage(projectId: string, languageId: string) {
    const language = await this.prisma.language.findFirst({
      where: { id: languageId, projectId },
      select: { id: true },
    });

    if (!language) {
      throw new NotFoundException('Language not found in project');
    }

    return this.prisma.project.update({
      where: { id: projectId },
      data: { referenceLanguageId: languageId },
    });
  }

  async update(projectId: string, languageId: string, dto: UpdateLanguageDto) {
    await this.ensureProjectExists(projectId);

    const language = await this.prisma.language.findFirst({
      where: { id: languageId, projectId },
      select: { id: true },
    });

    if (!language) {
      throw new NotFoundException('Language not found in project');
    }

    return this.prisma.language.update({
      where: { id: languageId },
      data: {
        code: dto.code?.toLowerCase(),
        name: dto.name,
      },
    });
  }

  async remove(projectId: string, languageId: string) {
    await this.ensureProjectExists(projectId);

    const language = await this.prisma.language.findFirst({
      where: { id: languageId, projectId },
      select: { id: true },
    });

    if (!language) {
      throw new NotFoundException('Language not found in project');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.project.updateMany({
        where: {
          id: projectId,
          referenceLanguageId: languageId,
        },
        data: {
          referenceLanguageId: null,
        },
      });

      await tx.analysisReport.deleteMany({
        where: { projectId },
      });

      await tx.language.delete({
        where: { id: languageId },
      });
    });

    return { deleted: true };
  }

  private async ensureProjectExists(projectId: string): Promise<void> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }
  }
}
