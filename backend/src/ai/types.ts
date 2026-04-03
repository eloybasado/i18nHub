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
