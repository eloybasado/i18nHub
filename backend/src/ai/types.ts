export type AiSuggestionItemInput = {
  key: string;
  referenceText: string;
  currentText?: string;
};

export type AiGlossaryEntryInput = {
  sourceTerm: string;
  targetTerm: string;
  languageCodes?: string[];
};

export type AiSuggestionItemOutput = {
  key: string;
  suggestion: string;
  reason?: string;
};

export type QualityReviewSuggestionInput = {
  key: string;
  translatedText: string;
};

export type QualityReviewSuggestionOutput = {
  key: string;
  currentText: string;
  suggestedText: string;
  reason: string;
  confidence: 'high' | 'medium' | 'low';
};

export type QualityReviewResult = {
  fileId: string;
  filename: string;
  languageCode: string;
  languageName: string;
  suggestions: QualityReviewSuggestionOutput[];
  reviewedAt: string;
};
