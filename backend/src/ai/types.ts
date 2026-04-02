export type AiSuggestionItemInput = {
  key: string;
  referenceText: string;
  currentText?: string;
};

export type AiSuggestionItemOutput = {
  key: string;
  suggestion: string;
  reason?: string;
};
