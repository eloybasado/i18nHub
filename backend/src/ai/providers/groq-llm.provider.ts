import { BadGatewayException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiSuggestionItemOutput } from '../types';
import { LlmProvider } from './llm-provider.interface';

@Injectable()
export class GroqLlmProvider implements LlmProvider {
  constructor(private readonly configService: ConfigService) {}

  async suggestBatch(params: {
    targetLanguageCode: string;
    items: Array<{
      key: string;
      referenceText: string;
      currentText?: string;
    }>;
  }): Promise<AiSuggestionItemOutput[]> {
    const apiKey = this.configService.getOrThrow<string>('GROQ_API_KEY');
    const endpoint = this.configService.getOrThrow<string>('GROQ_API_URL');
    const model = this.configService.getOrThrow<string>('GROQ_MODEL');

    const prompt = [
      'You are a professional software localization assistant.',
      `Target language code: ${params.targetLanguageCode}`,
      'Return ONLY a valid JSON array where each item has: key, suggestion, reason.',
      'Do not add markdown or extra text.',
      `Items: ${JSON.stringify(params.items)}`,
    ].join('\n');

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
}
