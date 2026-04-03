import {
  AiGlossaryEntryInput,
  AiSuggestionItemInput,
  AiSuggestionItemOutput,
} from '../types';

export interface LlmProvider {
  suggestBatch(params: {
    targetLanguageCode: string;
    context?: string;
    glossary?: AiGlossaryEntryInput[];
    items: AiSuggestionItemInput[];
  }): Promise<AiSuggestionItemOutput[]>;
}

export const LLM_PROVIDER = 'LLM_PROVIDER';
