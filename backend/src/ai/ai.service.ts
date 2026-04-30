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

  async reviewTranslationQuality(
    user: JwtPayload,
    projectId: string,
    translationFileId: string,
    targetLanguageCodes: string[],
  ) {
    if (user.tier !== 'PRO') {
      throw new ForbiddenException(
        'Translation quality review is available for PRO users only',
      );
    }

    const translationFile = await this.prisma.translationFile.findUnique({
      where: {
        id: translationFileId,
      },
      include: {
        language: true,
        fileGroup: true,
      },
    });

    if (!translationFile) {
      throw new NotFoundException('Translation file not found');
    }

    // Verify the file belongs to the project
    const fileGroupProject = await this.prisma.fileGroup.findUnique({
      where: {
        id: translationFile.fileGroupId,
      },
      select: {
        projectId: true,
      },
    });

    if (fileGroupProject?.projectId !== projectId) {
      throw new ForbiddenException(
        'Translation file does not belong to this project',
      );
    }

    const results: Array<{
      fileId: string;
      filename: string;
      languageCode: string;
      languageName: string;
      suggestions: Array<{
        key: string;
        currentText: string;
        suggestedText: string;
        reason: string;
        confidence: 'high' | 'medium' | 'low';
      }>;
      reviewedAt: string;
    }> = [];

    // Review each target language
    for (const languageCode of targetLanguageCodes) {
      const targetLanguage = await this.prisma.language.findFirst({
        where: {
          projectId,
          code: languageCode,
        },
      });

      if (!targetLanguage) {
        continue;
      }

      const targetFile = await this.prisma.translationFile.findFirst({
        where: {
          fileGroupId: translationFile.fileGroupId,
          languageId: targetLanguage.id,
        },
      });

      if (!targetFile) {
        continue;
      }

      // Extract translations to review
      const content = targetFile.content as Record<string, unknown>;
      const flattenedContent = this.flattenJson(content);

      const reviewItems = Array.from(flattenedContent.entries()).map(
        ([key, text]) => ({
          key,
          translatedText: String(text || ''),
        }),
      );

      if (reviewItems.length === 0) {
        continue;
      }

      // Call LLM to review quality
      const suggestions = await this.llmProvider.reviewQualityBatch({
        languageCode: targetLanguage.code,
        items: reviewItems,
      });

      results.push({
        fileId: targetFile.id,
        filename: targetFile.filename,
        languageCode: targetLanguage.code,
        languageName: targetLanguage.name,
        suggestions,
        reviewedAt: new Date().toISOString(),
      });
    }

    return { results };
  }

  private flattenJson(
    obj: Record<string, unknown>,
    prefix = '',
  ): Map<string, string> {
    const result = new Map<string, string>();

    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (typeof value === 'string') {
        result.set(fullKey, value);
      } else if (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value)
      ) {
        const nested = this.flattenJson(
          value as Record<string, unknown>,
          fullKey,
        );
        for (const [k, v] of nested.entries()) {
          result.set(k, v);
        }
      } else if (Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) {
          const item = value[i];
          const itemKey = `${fullKey}.${i}`;
          if (typeof item === 'string') {
            result.set(itemKey, item);
          } else if (typeof item === 'object' && item !== null) {
            const nested = this.flattenJson(
              item as Record<string, unknown>,
              itemKey,
            );
            for (const [k, v] of nested.entries()) {
              result.set(k, v);
            }
          }
        }
      }
    }

    return result;
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
