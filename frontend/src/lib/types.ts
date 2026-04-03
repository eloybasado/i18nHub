export type I18nPattern = 'SINGLE_FILE' | 'FOLDER_PER_LOCALE' | 'SUFFIX' | 'PREFIX';

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'MEMBER';
  tier: 'FREE' | 'PRO';
};

export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};

export type AccountProfile = {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'MEMBER';
  tier: 'FREE' | 'PRO';
  createdAt: string;
};

export type Project = {
  id: string;
  name: string;
  description?: string | null;
  i18nPattern: I18nPattern;
  ownerId: string;
  referenceLanguageId?: string | null;
  createdAt: string;
};

export type Language = {
  id: string;
  projectId: string;
  code: string;
  name: string;
};

export type IngestResponse = {
  filesIngested: number;
  fileGroupsAffected: number;
  pattern: I18nPattern;
};

export type TranslationFileSummary = {
  id: string;
  filename: string;
  uploadedAt: string;
  language: {
    id: string;
    code: string;
    name: string;
  };
  fileGroup: {
    id: string;
    name: string;
  };
};

export type TranslationFileDetail = TranslationFileSummary & {
  content: Record<string, unknown>;
};

export type TranslationFileVersionSummary = {
  id: string;
  versionNumber: number;
  createdAt: string;
  comment?: string | null;
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
};

export type IssueType = 'MISSING_KEY' | 'UNUSED_KEY' | 'INTERPOLATION_MISMATCH';

export type AnalysisIssue = {
  id: string;
  reportId: string;
  type: IssueType;
  key: string;
  languageId: string;
  referenceLanguageId: string;
  details?: Record<string, unknown> | null;
};

export type AnalysisReport = {
  id: string;
  projectId: string;
  fileGroupId?: string | null;
  createdAt: string;
  fileGroup?: {
    id: string;
    name: string;
  } | null;
  issues: AnalysisIssue[];
};

export type RunAnalysisResponse = {
  reportsCreated: number;
  issuesCreated: number;
  reports: Array<{
    id: string;
    fileGroupId: string;
    fileGroupName: string;
    issuesCreated: number;
  }>;
};

export type AiGlossaryEntry = {
  id: string;
  sourceTerm: string;
  targetTerm: string;
  languageCodes: string[];
};
