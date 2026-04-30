import { BadGatewayException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AiGlossaryEntryInput,
  AiSuggestionItemOutput,
  QualityReviewSuggestionInput,
  QualityReviewSuggestionOutput,
} from '../types';
import { LlmProvider } from './llm-provider.interface';

@Injectable()
export class GroqLlmProvider implements LlmProvider {
  constructor(private readonly configService: ConfigService) {}

  async suggestBatch(params: {
    targetLanguageCode: string;
    context?: string;
    glossary?: AiGlossaryEntryInput[];
    items: Array<{
      key: string;
      referenceText: string;
      currentText?: string;
    }>;
  }): Promise<AiSuggestionItemOutput[]> {
    const apiKey = this.configService.getOrThrow<string>('GROQ_API_KEY');
    const endpoint = this.configService.getOrThrow<string>('GROQ_API_URL');
    const model = this.configService.getOrThrow<string>('GROQ_MODEL');

    const normalizedTargetLanguage = params.targetLanguageCode
      .trim()
      .toLowerCase();
    const glossaryForTarget = (params.glossary ?? []).filter((entry) => {
      if (!entry.languageCodes || entry.languageCodes.length === 0) {
        return true;
      }

      return entry.languageCodes.some(
        (code) => code.trim().toLowerCase() === normalizedTargetLanguage,
      );
    });

    const prompt = [
      'You are a professional software localization assistant.',
      `Target language code: ${params.targetLanguageCode}`,
      params.context?.trim()
        ? `Translation context: ${params.context.trim()}`
        : null,
      glossaryForTarget.length > 0
        ? `Glossary constraints (must be respected): ${JSON.stringify(glossaryForTarget)}`
        : null,
      'Return ONLY a valid JSON array where each item has: key, suggestion, reason.',
      'Do not add markdown or extra text.',
      `Items: ${JSON.stringify(params.items)}`,
    ]
      .filter(Boolean)
      .join('\n');

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          {
            role: 'system',
            content:
              'You produce concise, accurate translation suggestions for i18n keys.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new BadGatewayException('AI provider request failed');
    }

    const payload = (await response.json()) as {
      choices?: Array<{
        message?: {
          content?: string;
        };
      }>;
    };

    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      throw new BadGatewayException('AI provider returned empty response');
    }

    try {
      const parsed = JSON.parse(content) as AiSuggestionItemOutput[];
      if (!Array.isArray(parsed)) {
        throw new Error('Invalid AI response format');
      }

      return parsed;
    } catch {
      throw new BadGatewayException('AI provider returned non-JSON response');
    }
  }

  async reviewQualityBatch(params: {
    languageCode: string;
    items: QualityReviewSuggestionInput[];
  }): Promise<QualityReviewSuggestionOutput[]> {
    const apiKey = this.configService.getOrThrow<string>('GROQ_API_KEY');
    const endpoint = this.configService.getOrThrow<string>('GROQ_API_URL');
    const model = this.configService.getOrThrow<string>('GROQ_MODEL');

    const prompt = [
      'You are a professional translation quality reviewer.',
      `Language: ${params.languageCode}`,
      'Review the provided translations for quality issues: typos, unnatural phrases, poor translations, inconsistencies.',
      'Return ONLY a valid JSON array with items that have issues. Each item should have: key, currentText, suggestedText, reason, confidence (high/medium/low).',
      'If a translation is correct, do not include it in the response.',
      'Be concise but helpful in the reason field.',
      'Do not add markdown or extra text.',
      `Items to review: ${JSON.stringify(params.items)}`,
    ]
      .filter(Boolean)
      .join('\n');

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        messages: [
          {
            role: 'system',
            content:
              'You are an expert translation quality reviewer. You identify and suggest fixes for translation issues.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new BadGatewayException('AI provider request failed');
    }

    const payload = (await response.json()) as {
      choices?: Array<{
        message?: {
          content?: string;
        };
      }>;
    };

    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      // Empty response means no quality issues found
      return [];
    }

    try {
      const parsed = JSON.parse(content) as QualityReviewSuggestionOutput[];
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed.filter(
        (item) =>
          item.key &&
          item.currentText &&
          item.suggestedText &&
          item.reason &&
          ['high', 'medium', 'low'].includes(item.confidence),
      );
    } catch {
      // If parsing fails, return empty array (no issues found)
      return [];
    }
  }
}
