import { AiSuggestionItemInput, AiSuggestionItemOutput } from '../types';

export interface LlmProvider {
  suggestBatch(params: {
    targetLanguageCode: string;
    items: AiSuggestionItemInput[];
  }): Promise<AiSuggestionItemOutput[]>;
}

export const LLM_PROVIDER = 'LLM_PROVIDER';
