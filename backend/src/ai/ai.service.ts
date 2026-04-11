import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Tier } from '@prisma/client';
import { JwtPayload } from '../auth/types';
import { PrismaService } from '../prisma/prisma.service';
import { SuggestTranslationsDto } from './dto/suggest-translations.dto';
import { UpdateAiContextDto } from './dto/update-ai-context.dto';
import type { LlmProvider } from './providers/llm-provider.interface';
import { LLM_PROVIDER } from './providers/llm-provider.interface';

type AiContextGlossaryEntry = {
  sourceTerm: string;
  targetTerm: string;
  languageCodes: string[];
};

@Injectable()
export class AiService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(LLM_PROVIDER)
    private readonly llmProvider: LlmProvider,
  ) {}

  async suggestTranslations(user: JwtPayload, dto: SuggestTranslationsDto) {
    if (user.tier !== Tier.PRO) {
      throw new ForbiddenException(
        'AI suggestions are available for PRO users only',
      );
    }

    const suggestions = await this.llmProvider.suggestBatch({
      targetLanguageCode: dto.targetLanguageCode,
      ...(dto.context?.trim() ? { context: dto.context.trim() } : {}),
      ...(dto.glossary && dto.glossary.length > 0
        ? { glossary: dto.glossary }
        : {}),
      items: dto.items,
    });

    return {
      count: suggestions.length,
      suggestions,
    };
  }

  async getContextSettings(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: {
        id: projectId,
      },
      select: {
        id: true,
        aiContext: true,
        aiGlossary: true,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return {
      context: project.aiContext ?? '',
      glossary: this.parseStoredGlossary(project.aiGlossary),
    };
  }

  async updateContextSettings(projectId: string, dto: UpdateAiContextDto) {
    const project = await this.prisma.project.findUnique({
      where: {
        id: projectId,
      },
      select: {
        id: true,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const data: Prisma.ProjectUpdateInput = {};

    if (dto.context !== undefined) {
      const normalizedContext = dto.context.trim();
      data.aiContext = normalizedContext || null;
    }

    if (dto.glossary !== undefined) {
      const normalizedGlossary = this.normalizeGlossary(dto.glossary);
      data.aiGlossary =
        normalizedGlossary.length > 0
          ? (normalizedGlossary as Prisma.InputJsonValue)
          : Prisma.DbNull;
    }

    if (Object.keys(data).length === 0) {
      return this.getContextSettings(projectId);
    }

    const updatedProject = await this.prisma.project.update({
      where: {
        id: projectId,
      },
      data,
      select: {
        aiContext: true,
        aiGlossary: true,
      },
    });

    return {
      context: updatedProject.aiContext ?? '',
      glossary: this.parseStoredGlossary(updatedProject.aiGlossary),
    };
  }

  private parseStoredGlossary(
    value: Prisma.JsonValue | null,
  ): AiContextGlossaryEntry[] {
    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .map((entry) => {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
          return null;
        }

        const record = entry as Record<string, unknown>;
        const sourceTerm =
          typeof record.sourceTerm === 'string' ? record.sourceTerm.trim() : '';
        const targetTerm =
          typeof record.targetTerm === 'string' ? record.targetTerm.trim() : '';
        const languageCodes = Array.isArray(record.languageCodes)
          ? record.languageCodes
              .filter((code) => typeof code === 'string')
              .map((code) => (code as string).trim())
              .filter((code) => code.length > 0)
          : [];

        if (!sourceTerm || !targetTerm) {
          return null;
        }

        return {
          sourceTerm,
          targetTerm,
          languageCodes,
        };
      })
      .filter((entry): entry is AiContextGlossaryEntry => Boolean(entry));
  }

  private normalizeGlossary(
    glossary: UpdateAiContextDto['glossary'],
  ): AiContextGlossaryEntry[] {
    if (!glossary || glossary.length === 0) {
      return [];
    }

    return glossary
      .map((entry) => {
        const sourceTerm = entry.sourceTerm.trim();
        const targetTerm = entry.targetTerm.trim();
        const languageCodes = (entry.languageCodes ?? [])
          .map((code) => code.trim())
          .filter((code) => code.length > 0);

        if (!sourceTerm || !targetTerm) {
          return null;
        }

        return {
          sourceTerm,
          targetTerm,
          languageCodes,
        };
      })
      .filter((entry): entry is AiContextGlossaryEntry => Boolean(entry));
  }
}
