import {
  AiGlossaryEntryInput,
  AiSuggestionItemInput,
  AiSuggestionItemOutput,
  QualityReviewSuggestionInput,
  QualityReviewSuggestionOutput,
} from '../types';

export interface LlmProvider {
  suggestBatch(params: {
    targetLanguageCode: string;
    context?: string;
    glossary?: AiGlossaryEntryInput[];
    items: AiSuggestionItemInput[];
  }): Promise<AiSuggestionItemOutput[]>;

  reviewQualityBatch(params: {
    languageCode: string;
    items: QualityReviewSuggestionInput[];
  }): Promise<QualityReviewSuggestionOutput[]>;
}

export const LLM_PROVIDER = 'LLM_PROVIDER';
