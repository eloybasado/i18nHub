import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { Tier } from '@prisma/client';
import { JwtPayload } from '../auth/types';
import { SuggestTranslationsDto } from './dto/suggest-translations.dto';
import type { LlmProvider } from './providers/llm-provider.interface';
import { LLM_PROVIDER } from './providers/llm-provider.interface';

@Injectable()
export class AiService {
  constructor(
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
}
