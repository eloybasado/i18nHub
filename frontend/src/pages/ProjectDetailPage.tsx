import JSZip from 'jszip';
import {
  Bot,
  CheckSquare,
  FilePenLine,
  FileSearch,
  FileUp,
  Languages,
  Plug,
  Star,
  Users,
} from 'lucide-react';
import type { ChangeEvent, DragEvent, FormEvent, ReactNode } from 'react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { AiContextSection } from '../components/project-detail/AiContextSection';
import { AnalysisSection } from '../components/project-detail/AnalysisSection';
import { EditorSection } from '../components/project-detail/EditorSection';
import { IntegrationsSection } from '../components/project-detail/IntegrationsSection';
import { LanguagesSection } from '../components/project-detail/LanguagesSection';
import { OverviewSection } from '../components/project-detail/OverviewSection';
import { QualityReviewSection } from '../components/project-detail/QualityReviewSection';
import { TeamSection } from '../components/project-detail/TeamSection';
import { UploadSection, type IngestFileItem } from '../components/project-detail/UploadSection';
import { Button } from '../components/ui/button';
import { ConfirmModal } from '../components/ui/confirm-modal';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { apiRequest } from '../lib/api';
import { session } from '../lib/session';
import { notify } from '../lib/toast';
import type {
  AiBatchSuggestionsResponse,
  AiContextSettingsResponse,
  AiGlossaryEntry,
  AnalysisIssue,
  AnalysisReport,
  IngestResponse,
  IssueType,
  Language,
  LanguageCoverageItem,
  LanguageCoverageResponse,
  LatestAnalysisResponse,
  Project,
  ProjectMember,
  RunAnalysisResponse,
  TranslationFileDetail,
  TranslationFileSummary,
  TranslationFileVersionSummary,
} from '../lib/types';

type VisualEntry = {
  path: string;
  value: string;
};

type AiSuggestionCandidate = {
  id: string;
  key: string;
  currentText: string;
  suggestion: string;
  reason?: string;
  issueType: IssueType;
  fileGroupId?: string;
  fileGroupName: string;
  targetTranslationFileId?: string;
  targetFilename?: string;
  applicableToCurrentFile: boolean;
  selected: boolean;
};

type AiSuggestionScope = 'CURRENT_FILE_ISSUES' | 'ALL_FILES_ISSUES' | 'ALL_FILES_BY_TYPE';

type AnalysisReportMeta = {
  id: string;
  fileGroupId: string;
  fileGroupName: string;
  issuesCreated: number;
};

const toAiContextPayload = (context: string, glossaryEntries: AiGlossaryEntry[]) => {
  return {
    context,
    glossary: glossaryEntries
      .map((entry) => ({
        sourceTerm: entry.sourceTerm.trim(),
        targetTerm: entry.targetTerm.trim(),
        languageCodes: entry.languageCodes.map((code) => code.trim()).filter((code) => code.length > 0),
      }))
      .filter((entry) => entry.sourceTerm.length > 0 && entry.targetTerm.length > 0),
  };
};

const toAiContextSignature = (context: string, glossaryEntries: AiGlossaryEntry[]) => {
  const payload = toAiContextPayload(context, glossaryEntries);
  return JSON.stringify(payload);
};

const toAiGlossaryEntries = (glossary: AiContextSettingsResponse['glossary']): AiGlossaryEntry[] => {
  return glossary.map((entry, index) => ({
    id: `persisted-${index}-${entry.sourceTerm}-${entry.targetTerm}`,
    sourceTerm: entry.sourceTerm,
    targetTerm: entry.targetTerm,
    languageCodes: entry.languageCodes,
  }));
};

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const extractStringEntries = (value: unknown, prefix = '', acc: VisualEntry[] = []): VisualEntry[] => {
  if (typeof value === 'string') {
    acc.push({ path: prefix, value });
    return acc;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      const nextPrefix = prefix ? `${prefix}.${index}` : String(index);
      extractStringEntries(item, nextPrefix, acc);
    });
    return acc;
  }

  if (isPlainObject(value)) {
    Object.entries(value).forEach(([key, nestedValue]) => {
      const nextPrefix = prefix ? `${prefix}.${key}` : key;
      extractStringEntries(nestedValue, nextPrefix, acc);
    });
  }

  return acc;
};

const setStringByPath = (target: unknown, path: string, value: string): void => {
  type JsonContainer = Record<string, unknown> | unknown[];

  const segments = path.split('.');
  let cursor = target as JsonContainer;

  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    const isLast = index === segments.length - 1;
    const nextSegment = segments[index + 1];
    const nextIsArrayIndex = nextSegment !== undefined && /^\d+$/.test(nextSegment);
    const cursorIsArray = Array.isArray(cursor);
    const arrayKey = Number(segment);
    const objectKey = segment;

    if (isLast && cursorIsArray) {
      (cursor as unknown[])[arrayKey] = value;
      return;
    }

    if (isLast && !cursorIsArray) {
      (cursor as Record<string, unknown>)[objectKey] = value;
      return;
    }

    const nextValue = cursorIsArray ? (cursor as unknown[])[arrayKey] : (cursor as Record<string, unknown>)[objectKey];

    if (nextValue === undefined || nextValue === null || typeof nextValue !== 'object') {
      const initialized = nextIsArrayIndex ? [] : {};

      if (cursorIsArray) {
        (cursor as unknown[])[arrayKey] = initialized;
      } else {
        (cursor as Record<string, unknown>)[objectKey] = initialized;
      }

      cursor = initialized as JsonContainer;
      continue;
    }

    cursor = nextValue as JsonContainer;
  }
};

const deleteKeyByPath = (obj: Record<string, unknown>, path: string): void => {
  const parts = path.split('.');
  let cursor: unknown = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!cursor || typeof cursor !== 'object') return;
    const key = parts[i];
    cursor = Array.isArray(cursor) ? (cursor as unknown[])[Number(key)] : (cursor as Record<string, unknown>)[key];
  }
  if (!cursor || typeof cursor !== 'object') return;
  const lastKey = parts[parts.length - 1];
  if (Array.isArray(cursor)) {
    (cursor as unknown[]).splice(Number(lastKey), 1);
  } else {
    delete (cursor as Record<string, unknown>)[lastKey];
  }
};

const getValueByPath = (obj: unknown, path: string): unknown => {
  const parts = path.split('.');
  let cursor: unknown = obj;

  for (const part of parts) {
    if (!cursor || typeof cursor !== 'object') {
      return undefined;
    }

    cursor = Array.isArray(cursor) ? (cursor as unknown[])[Number(part)] : (cursor as Record<string, unknown>)[part];
  }

  return cursor;
};

const buildVisualContent = (baseContent: Record<string, unknown>, entries: VisualEntry[]) => {
  const cloned = JSON.parse(JSON.stringify(baseContent)) as Record<string, unknown>;
  entries.forEach((entry) => {
    setStringByPath(cloned, entry.path, entry.value);
  });
  return cloned;
};

const PATTERN_LABELS: Record<Project['i18nPattern'], string> = {
  SINGLE_FILE: 'Archivo unico por idioma',
  FOLDER_PER_LOCALE: 'Carpeta por idioma',
  SUFFIX: 'Sufijo (home_es.json)',
  PREFIX: 'Prefijo (es_home.json)',
};

const SECTION_ITEMS = [
  { id: 'overview', label: 'Resumen' },
  { id: 'team', label: 'Equipo' },
  { id: 'languages', label: 'Idiomas' },
  { id: 'upload', label: 'Carga' },
  { id: 'editor', label: 'Editor' },
  { id: 'ai-context', label: 'Contexto IA' },
  { id: 'analysis', label: 'Análisis' },
  { id: 'quality-review', label: 'Calidad' },
  { id: 'integrations', label: 'Integraciones' },
] as const;

type SectionId = (typeof SECTION_ITEMS)[number]['id'];
type CloneMode = 'EMPTY_STRUCTURE' | 'COPY_CONTENT' | 'AI_TRANSLATE_FULL';

const sectionIconById: Record<SectionId, ReactNode> = {
  overview: <Star size={14} />,
  team: <Users size={14} />,
  languages: <Languages size={14} />,
  upload: <FileUp size={14} />,
  editor: <FilePenLine size={14} />,
  'ai-context': <Bot size={14} />,
  analysis: <FileSearch size={14} />,
  'quality-review': <CheckSquare size={14} />,
  integrations: <Plug size={14} />,
};

function SectionNavSidebar({
  activeSection,
  onSelect,
}: {
  activeSection: SectionId;
  onSelect: (id: SectionId) => void;
}) {
  const navRef = useRef<HTMLElement>(null);
  const [pill, setPill] = useState({ top: 0, height: 44 });

  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const active = nav.querySelector<HTMLElement>('[data-active="true"]');
    if (!active) return;
    setPill({ top: active.offsetTop, height: active.offsetHeight });
  }, [activeSection]);

  return (
    <nav ref={navRef} className="relative space-y-1">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 rounded-md bg-zinc-900 transition-all duration-200 ease-out"
        style={{ top: pill.top, height: pill.height }}
      />
      {SECTION_ITEMS.map((section) => {
        const isActive = activeSection === section.id;
        return (
          <button
            key={section.id}
            type="button"
            data-active={isActive ? 'true' : undefined}
            className={`relative z-10 flex w-full items-center justify-between rounded-md px-3 py-2.5 text-left text-sm transition-colors duration-200 ${
              isActive ? 'text-white' : 'text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900'
            }`}
            onClick={() => onSelect(section.id)}
          >
            <span className="inline-flex items-center gap-2">
              {sectionIconById[section.id]}
              {section.label}
            </span>
            <span className={`h-1.5 w-1.5 rounded-full transition-colors duration-200 ${isActive ? 'bg-white' : 'bg-zinc-300'}`} />
          </button>
        );
      })}
    </nav>
  );
}

function SectionNavMobile({
  activeSection,
  onSelect,
}: {
  activeSection: SectionId;
  onSelect: (id: SectionId) => void;
}) {
  const navRef = useRef<HTMLElement>(null);
  const [pill, setPill] = useState({ left: 0, top: 0, width: 0, height: 0 });

  useLayoutEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const active = nav.querySelector<HTMLElement>('[data-active="true"]');
    if (!active) return;
    setPill({
      left: active.offsetLeft,
      top: active.offsetTop,
      width: active.offsetWidth,
      height: active.offsetHeight,
    });
  }, [activeSection]);

  return (
    <nav ref={navRef} className="relative grid grid-cols-3 gap-1">
      <div
        aria-hidden
        className="pointer-events-none absolute rounded-lg bg-zinc-900 transition-all duration-200 ease-out"
        style={{ left: pill.left, top: pill.top, width: pill.width, height: pill.height }}
      />
      {SECTION_ITEMS.map((section) => {
        const isActive = activeSection === section.id;
        return (
          <button
            key={section.id}
            type="button"
            data-active={isActive ? 'true' : undefined}
            className={`relative z-10 flex flex-col items-center gap-1 rounded-lg px-2 py-2 text-[11px] font-medium transition-colors duration-200 ${
              isActive ? 'text-white' : 'text-zinc-600 hover:text-zinc-900'
            }`}
            onClick={() => onSelect(section.id)}
          >
            {sectionIconById[section.id]}
            <span>{section.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export function ProjectDetailPage() {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [teamMembers, setTeamMembers] = useState<ProjectMember[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [languageCoverageByLanguageId, setLanguageCoverageByLanguageId] = useState<
    Record<string, LanguageCoverageItem>
  >({});
  const [translationFiles, setTranslationFiles] = useState<TranslationFileSummary[]>([]);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [memberRole, setMemberRole] = useState<'EDITOR' | 'VIEWER'>('VIEWER');
  const [memberToRemove, setMemberToRemove] = useState<ProjectMember | null>(null);
  const [memberToTransfer, setMemberToTransfer] = useState<ProjectMember | null>(null);
  const [ingestFiles, setIngestFiles] = useState<IngestFileItem[]>([]);
  const [analysisReport, setAnalysisReport] = useState<AnalysisReport | null>(null);
  const [versionHistoryLimitDraft, setVersionHistoryLimitDraft] = useState('10');
  const [versionHistoryLimitSaving, setVersionHistoryLimitSaving] = useState(false);

  const [issueTypeFilter, setIssueTypeFilter] = useState<'ALL' | IssueType>('ALL');
  const [issueLanguageFilter, setIssueLanguageFilter] = useState<'ALL' | string>('ALL');
  const [fileToDelete, setFileToDelete] = useState<TranslationFileSummary | null>(null);
  const [languageToDelete, setLanguageToDelete] = useState<Language | null>(null);
  const [languageToEdit, setLanguageToEdit] = useState<Language | null>(null);
  const [languageEditCode, setLanguageEditCode] = useState('');
  const [languageEditName, setLanguageEditName] = useState('');
  const [languageActionBusy, setLanguageActionBusy] = useState(false);
  const [editorFileId, setEditorFileId] = useState<string | null>(null);
  const [editorFileMeta, setEditorFileMeta] = useState<TranslationFileSummary | null>(null);
  const [editorMode, setEditorMode] = useState<'RAW' | 'VISUAL' | 'TREE'>('RAW');
  const [editorReferenceEntries, setEditorReferenceEntries] = useState<VisualEntry[] | null>(null);
  const [showReferenceOverlay, setShowReferenceOverlay] = useState(true);
  const [editorSourceContent, setEditorSourceContent] = useState<Record<string, unknown> | null>(null);
  const [editorVisualEntries, setEditorVisualEntries] = useState<VisualEntry[]>([]);
  const [editorVisualQuery, setEditorVisualQuery] = useState('');
  const [editorJson, setEditorJson] = useState('');
  const [editorBaselineJson, setEditorBaselineJson] = useState('');
  const [editorTargetLanguageId, setEditorTargetLanguageId] = useState('');
  const [editorCloneMode, setEditorCloneMode] = useState<CloneMode>('EMPTY_STRUCTURE');
  const [cloneConfirmOpen, setCloneConfirmOpen] = useState(false);
  const [editorVersions, setEditorVersions] = useState<TranslationFileVersionSummary[]>([]);
  const [editorVersionsLoading, setEditorVersionsLoading] = useState(false);
  const [aiSuggestBusy, setAiSuggestBusy] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<AiSuggestionCandidate[]>([]);
  const [aiSuggestionScope, setAiSuggestionScope] = useState<AiSuggestionScope>('CURRENT_FILE_ISSUES');
  const [aiSuggestionIssueTypeFilter, setAiSuggestionIssueTypeFilter] = useState<IssueType>('MISSING_KEY');
  const [aiContext, setAiContext] = useState('');
  const [aiGlossaryEntries, setAiGlossaryEntries] = useState<AiGlossaryEntry[]>([]);
  const [aiContextHydrated, setAiContextHydrated] = useState(false);
  const [aiContextSaving, setAiContextSaving] = useState(false);
  const [aiContextSavedSignature, setAiContextSavedSignature] = useState('');
  const [editorBusy, setEditorBusy] = useState(false);
  const [downloadBusy, setDownloadBusy] = useState(false);
  const [expandedIssueId, setExpandedIssueId] = useState<string | null>(null);
  const [activeIssueId, setActiveIssueId] = useState<string | null>(null);
  const [persistedResolvedIds, setPersistedResolvedIds] = useState<Set<string>>(new Set());
  const [highlightedIssuePath, setHighlightedIssuePath] = useState<string | null>(null);
  const [highlightedRawLine, setHighlightedRawLine] = useState<number | null>(null);
  const [reportGroupByReportId, setReportGroupByReportId] = useState<Record<string, string>>({});
  const [reportGroupNameByReportId, setReportGroupNameByReportId] = useState<Record<string, string>>({});
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionId>('overview');
  const [loading, setLoading] = useState(false);
  const [teamLoading, setTeamLoading] = useState(false);
  const [error, setError] = useState('');
  const [languageMappingModalOpen, setLanguageMappingModalOpen] = useState(false);
  const [languageMapping, setLanguageMapping] = useState<Record<string, string | null>>({});
  const [proModalOpen, setProModalOpen] = useState(false);
  const [pendingIssue, setPendingIssue] = useState<AnalysisIssue | null>(null);
  const [goToIssueModalOpen, setGoToIssueModalOpen] = useState(false);
  const hasConfiguredLanguages = languages.length > 0;

  const getCurrentUserId = (): string | null => {
    const token = session.getAccessToken();
    if (!token) {
      return null;
    }

    try {
      const payloadBase64 = token.split('.')[1];
      if (!payloadBase64) {
        return null;
      }

      const normalized = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
      const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
      const decoded = JSON.parse(atob(padded)) as { sub?: string };
      return decoded.sub ?? null;
    } catch {
      return null;
    }
  };

  const getCurrentUserTier = (): 'FREE' | 'PRO' | null => {
    const token = session.getAccessToken();
    if (!token) {
      return null;
    }

    try {
      const payloadBase64 = token.split('.')[1];
      if (!payloadBase64) {
        return null;
      }

      const normalized = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
      const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
      const decoded = JSON.parse(atob(padded)) as { tier?: 'FREE' | 'PRO' };
      return decoded.tier ?? null;
    } catch {
      return null;
    }
  };

  const currentUserId = getCurrentUserId();
  const isPro = getCurrentUserTier() === 'PRO';
  const projectVersionHistoryLimit = project?.versionHistoryLimit ?? 10;
  const canManageTeam = Boolean(project && currentUserId && project.ownerId === currentUserId);
  const canEditVersionHistoryLimit = canManageTeam;
  const canLeaveProject = Boolean(project && currentUserId && project.ownerId !== currentUserId);

  useEffect(() => {
    setVersionHistoryLimitDraft(String(projectVersionHistoryLimit));
  }, [projectVersionHistoryLimit]);

  const parseFilesForIngest = async (files: File[]) => {
    try {
      const parsed = await Promise.all(
        files.map(async (file) => {
          const text = await file.text();
          const content = JSON.parse(text) as unknown;
          const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;

          return {
            path: relativePath,
            content,
          };
        }),
      );

      setIngestFiles(parsed);
      notify.info(`Archivos preparados: ${parsed.length}`);

      // If project uses FOLDER_PER_LOCALE, detect files without a clear locale
      if (project?.i18nPattern === 'FOLDER_PER_LOCALE') {
        const languageCodes = new Set(languages.map((l) => l.code.toLowerCase()));
        const needsMapping = parsed.filter((p) => {
          const normalizedPath = p.path.replace(/\\/g, '/');
          const parts = normalizedPath.split('/').filter(Boolean);
          const locale = parts.at(-2);
          return !locale || !languageCodes.has((locale || '').toLowerCase());
        });

        if (needsMapping.length > 0) {
          // open modal to ask user to map each file to a language
          setLanguageMappingModalOpen(true);
          const initial: Record<string, string | null> = {};
          for (const item of needsMapping) initial[item.path] = null;
          setLanguageMapping(initial);
        }
      }
    } catch {
      setIngestFiles([]);
      const message = 'Uno o varios archivos seleccionados no son JSON valido';
      setError(message);
      notify.error(message);
    }
  };

  const applyLanguageMapping = () => {
    // For each mapping, rewrite the ingestFiles path to include the selected language folder
    setIngestFiles((previous) =>
      previous.map((item) => {
        const mapped = languageMapping[item.path];
        if (!mapped) return item;
        const filename = item.path.replace(/\\/g, '/').split('/').pop() || item.path;
        return {
          ...item,
          path: `${mapped}/${filename}`,
        };
      }),
    );

    setLanguageMappingModalOpen(false);
    notify.info('Mapeado de idiomas aplicado a archivos seleccionados');
  };

  const hydrateAnalysisFromReportMetas = useCallback(
    async (reportMetas: AnalysisReportMeta[]) => {
      if (!projectId) {
        return false;
      }

      if (reportMetas.length === 0) {
        setAnalysisReport(null);
        setReportGroupByReportId({});
        setReportGroupNameByReportId({});
        setIssueTypeFilter('ALL');
        setIssueLanguageFilter('ALL');
        setExpandedIssueId(null);
        setActiveIssueId(null);
        setPersistedResolvedIds(new Set());
        return false;
      }

      const reports = await Promise.all(
        reportMetas.map((reportMeta) =>
          apiRequest<AnalysisReport>(`/projects/${projectId}/analysis/reports/${reportMeta.id}`, {
            auth: true,
          }),
        ),
      );

      setReportGroupByReportId(
        Object.fromEntries(
          reports
            .filter((report) => Boolean(report.fileGroup?.id))
            .map((report) => [report.id, report.fileGroup?.id as string]),
        ),
      );

      setReportGroupNameByReportId(
        Object.fromEntries(
          reportMetas.map((report) => [
            report.id,
            report.fileGroupName?.trim() ? report.fileGroupName : 'Grupo sin identificar',
          ]),
        ),
      );

      const combinedReport: AnalysisReport = {
        id: reports[0]?.id ?? 'combined-report',
        projectId,
        createdAt: reports[0]?.createdAt ?? new Date().toISOString(),
        fileGroup: null,
        issues: reports.flatMap((report) => report.issues),
      };

      setAnalysisReport(combinedReport);
      setIssueTypeFilter('ALL');
      setIssueLanguageFilter('ALL');
      setExpandedIssueId(null);
      setActiveIssueId(null);
      setPersistedResolvedIds(new Set());

      return true;
    },
    [projectId],
  );

  const loadLatestAnalysis = useCallback(
    async (silent = false) => {
      if (!projectId) {
        return false;
      }

      try {
        const latest = await apiRequest<LatestAnalysisResponse>(`/projects/${projectId}/analysis/latest`, {
          auth: true,
        });

        const loaded = await hydrateAnalysisFromReportMetas(latest.reports);
        if (!loaded && !silent) {
          notify.info('No hay análisis previos guardados');
          return false;
        }

        if (loaded && !silent) {
          notify.success(
            `Último análisis recuperado: ${latest.issuesCreated} issue(s) en ${latest.reportsCreated} reporte(s)`,
          );
        }

        return loaded;
      } catch {
        if (!silent) {
          notify.error('No se pudo recuperar el último análisis guardado');
        }
        return false;
      }
    },
    [projectId, hydrateAnalysisFromReportMetas],
  );

  const load = useCallback(async () => {
    if (!projectId) return;

    try {
      const [projectData, membersData, languagesData, filesData, aiContextSettings, languageCoverage] =
        await Promise.all([
          apiRequest<Project>(`/projects/${projectId}`, { auth: true }),
          apiRequest<ProjectMember[]>(`/projects/${projectId}/members`, { auth: true }),
          apiRequest<Language[]>(`/projects/${projectId}/languages`, { auth: true }),
          apiRequest<TranslationFileSummary[]>(`/projects/${projectId}/translation-files`, { auth: true }),
          apiRequest<AiContextSettingsResponse>(`/projects/${projectId}/ai/context`, {
            auth: true,
          }).catch(() => ({
            context: '',
            glossary: [],
          })),
          apiRequest<LanguageCoverageResponse>(`/projects/${projectId}/analysis/coverage`, {
            auth: true,
          }).catch(() => ({
            referenceLanguageId: null,
            languages: [],
          })),
        ]);

      const glossaryEntries = toAiGlossaryEntries(aiContextSettings.glossary);
      const savedSignature = toAiContextSignature(aiContextSettings.context, glossaryEntries);

      setProject(projectData);
      setVersionHistoryLimitDraft(String(projectData.versionHistoryLimit ?? 10));
      setTeamMembers(membersData);
      setLanguages(languagesData);
      setLanguageCoverageByLanguageId(
        Object.fromEntries(languageCoverage.languages.map((item) => [item.languageId, item])),
      );
      setTranslationFiles(filesData);
      setAiContext(aiContextSettings.context);
      setAiGlossaryEntries(glossaryEntries);
      setAiContextSavedSignature(savedSignature);
      setAiContextHydrated(true);
      await loadLatestAnalysis(true);
    } catch {
      setError('No se pudo cargar el proyecto');
    }
  }, [projectId, loadLatestAnalysis]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!projectId || !aiContextHydrated) {
      return;
    }

    const currentSignature = toAiContextSignature(aiContext, aiGlossaryEntries);
    if (currentSignature === aiContextSavedSignature) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const persist = async () => {
        setAiContextSaving(true);

        try {
          const payload = toAiContextPayload(aiContext, aiGlossaryEntries);

          const saved = await apiRequest<AiContextSettingsResponse>(`/projects/${projectId}/ai/context`, {
            method: 'PATCH',
            auth: true,
            body: payload,
          });

          const savedEntries = toAiGlossaryEntries(saved.glossary);
          setAiContextSavedSignature(toAiContextSignature(saved.context, savedEntries));
        } catch {
          // Keep silent to avoid noisy toasts while typing.
        } finally {
          setAiContextSaving(false);
        }
      };

      void persist();
    }, 450);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [aiContext, aiContextHydrated, aiContextSavedSignature, aiGlossaryEntries, projectId]);

  const onAddLanguage = async (event: FormEvent) => {
    event.preventDefault();
    if (!projectId) return;

    setLoading(true);
    setError('');

    try {
      await apiRequest(`/projects/${projectId}/languages`, {
        method: 'POST',
        auth: true,
        body: { code, name },
      });
      setCode('');
      setName('');
      notify.success('Idioma anadido correctamente');
      await load();
    } catch {
      const message = 'No se pudo anadir el idioma';
      setError(message);
      notify.error(message);
    } finally {
      setLoading(false);
    }
  };

  const onAddMember = async (event: FormEvent) => {
    event.preventDefault();
    if (!projectId) return;

    if (!canManageTeam) {
      notify.error('Solo el owner del proyecto puede anadir miembros');
      return;
    }

    setTeamLoading(true);
    setError('');

    try {
      await apiRequest(`/projects/${projectId}/members`, {
        method: 'POST',
        auth: true,
        body: {
          email: memberEmail,
          role: memberRole,
        },
      });

      notify.success('Miembro anadido correctamente');
      setMemberEmail('');
      setMemberRole('VIEWER');
      await load();
    } catch {
      const message = 'No se pudo anadir el miembro';
      setError(message);
      notify.error(message);
    } finally {
      setTeamLoading(false);
    }
  };

  const onUpdateMemberRole = async (member: ProjectMember, role: 'EDITOR' | 'VIEWER') => {
    if (!projectId) return;

    if (!canManageTeam) {
      notify.error('Solo el owner del proyecto puede gestionar roles');
      return;
    }

    if (member.isOwner || member.role === role) {
      return;
    }

    setTeamLoading(true);
    setError('');

    try {
      await apiRequest(`/projects/${projectId}/members/${member.userId}`, {
        method: 'PATCH',
        auth: true,
        body: { role },
      });

      notify.success('Rol del miembro actualizado');
      await load();
    } catch {
      const message = 'No se pudo actualizar el rol del miembro';
      setError(message);
      notify.error(message);
    } finally {
      setTeamLoading(false);
    }
  };

  const removeMember = async () => {
    if (!projectId || !memberToRemove) return;

    setTeamLoading(true);
    setError('');

    try {
      await apiRequest(`/projects/${projectId}/members/${memberToRemove.userId}`, {
        method: 'DELETE',
        auth: true,
      });

      notify.success('Miembro eliminado del proyecto');
      setMemberToRemove(null);
      await load();
    } catch {
      const message = 'No se pudo eliminar el miembro';
      setError(message);
      notify.error(message);
    } finally {
      setTeamLoading(false);
    }
  };

  const leaveProject = async () => {
    if (!projectId || !currentUserId) return;

    setTeamLoading(true);
    setError('');

    try {
      await apiRequest(`/projects/${projectId}/members/leave`, {
        method: 'POST',
        auth: true,
      });

      notify.success('Has salido del proyecto');
      navigate('/projects');
    } catch {
      const message = 'No se pudo salir del proyecto';
      setError(message);
      notify.error(message);
    } finally {
      setTeamLoading(false);
    }
  };

  const transferOwnership = async () => {
    if (!projectId || !memberToTransfer) return;

    setTeamLoading(true);
    setError('');

    try {
      await apiRequest(`/projects/${projectId}/ownership/transfer`, {
        method: 'POST',
        auth: true,
        body: {
          newOwnerUserId: memberToTransfer.userId,
        },
      });

      notify.success('Ownership transferido correctamente');
      setMemberToTransfer(null);
      await load();
    } catch {
      const message = 'No se pudo transferir el ownership';
      setError(message);
      notify.error(message);
    } finally {
      setTeamLoading(false);
    }
  };

  const setReference = async (languageId: string) => {
    if (!projectId) return;

    try {
      await apiRequest(`/projects/${projectId}/languages/reference`, {
        method: 'PATCH',
        auth: true,
        body: { languageId },
      });
      notify.success('Idioma de referencia actualizado');
      await load();
    } catch {
      const message = 'No se pudo establecer el idioma de referencia';
      setError(message);
      notify.error(message);
    }
  };

  const openLanguageEditModal = (language: Language) => {
    setLanguageToEdit(language);
    setLanguageEditCode(language.code);
    setLanguageEditName(language.name);
  };

  const updateLanguage = async (event: FormEvent) => {
    event.preventDefault();
    if (!projectId || !languageToEdit) return;

    setLanguageActionBusy(true);
    try {
      await apiRequest(`/projects/${projectId}/languages/${languageToEdit.id}`, {
        method: 'PATCH',
        auth: true,
        body: {
          code: languageEditCode,
          name: languageEditName,
        },
      });

      notify.success('Idioma actualizado correctamente');
      setLanguageToEdit(null);
      setLanguageEditCode('');
      setLanguageEditName('');
      await load();
    } catch {
      notify.error('No se pudo actualizar el idioma');
    } finally {
      setLanguageActionBusy(false);
    }
  };

  const removeLanguage = async () => {
    if (!projectId || !languageToDelete) return;

    setLanguageActionBusy(true);
    try {
      await apiRequest(`/projects/${projectId}/languages/${languageToDelete.id}`, {
        method: 'DELETE',
        auth: true,
      });

      if (editorFileMeta?.language.id === languageToDelete.id) {
        setEditorFileId(null);
        setEditorFileMeta(null);
        setEditorSourceContent(null);
        setEditorVisualEntries([]);
        setEditorVisualQuery('');
        setEditorJson('');
        setEditorTargetLanguageId('');
        setEditorVersions([]);
        setEditorVersionsLoading(false);
        setAiSuggestions([]);
      }

      notify.success('Idioma eliminado correctamente');
      setLanguageToDelete(null);
      await load();
    } catch {
      notify.error('No se pudo eliminar el idioma');
    } finally {
      setLanguageActionBusy(false);
    }
  };

  const onPickFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!hasConfiguredLanguages) {
      notify.info('Primero añade al menos un idioma en la sección Idiomas.');
      setActiveSection('languages');
      return;
    }

    const files = event.target.files;
    if (!files || files.length === 0) {
      setIngestFiles([]);
      return;
    }

    setError('');

    await parseFilesForIngest(Array.from(files));
  };

  const onDropFiles = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDraggingFiles(false);

    if (!hasConfiguredLanguages) {
      notify.info('Primero añade al menos un idioma en la sección Idiomas.');
      setActiveSection('languages');
      return;
    }

    const droppedFiles = Array.from(event.dataTransfer.files).filter((file) =>
      file.name.toLowerCase().endsWith('.json'),
    );
    if (droppedFiles.length === 0) {
      notify.error('Arrastra archivos JSON validos');
      return;
    }

    setError('');
    await parseFilesForIngest(droppedFiles);
  };

  const onDragOverFiles = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDraggingFiles(true);
  };

  const onDragLeaveFiles = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDraggingFiles(false);
  };

  const onIngest = async () => {
    if (!projectId || ingestFiles.length === 0) {
      return;
    }

    if (!hasConfiguredLanguages) {
      notify.info('Configura idiomas antes de cargar archivos para evitar errores de mapeo.');
      setActiveSection('languages');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await apiRequest<IngestResponse>(`/projects/${projectId}/translation-files/ingest`, {
        method: 'POST',
        auth: true,
        body: { files: ingestFiles },
      });

      notify.success(`Se cargaron ${response.filesIngested} archivo(s) en ${response.fileGroupsAffected} grupo(s)`);
      setIngestFiles([]);
      await load();
    } catch {
      const message = 'No se pudieron cargar los archivos';
      setError(message);
      notify.error(message);
    } finally {
      setLoading(false);
    }
  };

  const removeTranslationFile = async () => {
    if (!projectId) return;
    if (!fileToDelete) return;

    try {
      await apiRequest(`/projects/${projectId}/translation-files/${fileToDelete.id}`, {
        method: 'DELETE',
        auth: true,
      });
      notify.success('Archivo eliminado');
      setFileToDelete(null);
      await load();
    } catch {
      notify.error('No se pudo eliminar el archivo');
    }
  };

  const openEditorForFile = async (
    translationFileId: string,
    options?: {
      initialVisualQuery?: string;
      skipNotify?: boolean;
    },
  ) => {
    if (!projectId) return;

    const initialVisualQuery = options?.initialVisualQuery ?? '';

    if (editorFileMeta) {
      setPersistedResolvedIds((prev) => {
        const next = new Set(prev);
        for (const id of resolvedIssueIds) next.add(id);
        return next;
      });
    }

    setEditorBusy(true);
    try {
      const file = await apiRequest<TranslationFileDetail>(
        `/projects/${projectId}/translation-files/${translationFileId}`,
        { auth: true },
      );
      setEditorFileId(file.id);
      setEditorFileMeta(file);
      setEditorSourceContent(file.content);
      setEditorVisualEntries(extractStringEntries(file.content));
      setEditorVisualQuery(initialVisualQuery);
      setEditorJson(JSON.stringify(file.content, null, 2));
      setEditorBaselineJson(JSON.stringify(file.content, null, 2));
      setEditorTargetLanguageId('');
      setEditorCloneMode('EMPTY_STRUCTURE');
      setCloneConfirmOpen(false);
      setAiSuggestions([]);

      const refLangId = project?.referenceLanguageId;
      if (refLangId && refLangId !== file.language.id) {
        const refFile = translationFiles.find(
          (f) => f.language.id === refLangId && f.fileGroup.id === file.fileGroup.id,
        );
        if (refFile) {
          try {
            const refDetail = await apiRequest<TranslationFileDetail>(
              `/projects/${projectId}/translation-files/${refFile.id}`,
              { auth: true },
            );
            setEditorReferenceEntries(extractStringEntries(refDetail.content));
          } catch {
            setEditorReferenceEntries(null);
          }
        } else {
          setEditorReferenceEntries(null);
        }
      } else {
        setEditorReferenceEntries(null);
      }

      if (isPro) {
        setEditorVersionsLoading(true);
        try {
          const versions = await apiRequest<TranslationFileVersionSummary[]>(
            `/projects/${projectId}/translation-files/${file.id}/versions`,
            { auth: true },
          );
          setEditorVersions(versions);
        } catch {
          setEditorVersions([]);
        } finally {
          setEditorVersionsLoading(false);
        }
      }

      if (!options?.skipNotify) {
        notify.success(`Archivo abierto en editor: ${file.filename}`);
      }
      return file;
    } catch {
      notify.error('No se pudo cargar el archivo en el editor');
      return null;
    } finally {
      setEditorBusy(false);
    }
  };

  const findBestMatchingPath = (targetKey: string, paths: string[]): string | null => {
    if (paths.length === 0) {
      return null;
    }

    const normalizedTarget = targetKey.trim().toLowerCase();

    const exact = paths.find((path) => path.toLowerCase() === normalizedTarget);
    if (exact) {
      return exact;
    }

    const startsWith = paths.find((path) => path.toLowerCase().startsWith(`${normalizedTarget}.`));
    if (startsWith) {
      return startsWith;
    }

    const contains = paths.find((path) => path.toLowerCase().includes(normalizedTarget));
    if (contains) {
      return contains;
    }

    return null;
  };

  const refreshEditorVersions = async (translationFileId: string) => {
    if (!isPro || !projectId) {
      return;
    }

    try {
      const versions = await apiRequest<TranslationFileVersionSummary[]>(
        `/projects/${projectId}/translation-files/${translationFileId}/versions`,
        { auth: true },
      );
      setEditorVersions(versions);
    } catch {
      setEditorVersions([]);
    }
  };

  const saveEditorFile = async () => {
    if (!projectId || !editorFileId) return false;

    let parsedContent: Record<string, unknown>;

    if (editorMode === 'RAW') {
      try {
        parsedContent = JSON.parse(editorJson) as Record<string, unknown>;
      } catch {
        notify.error('El JSON no es valido. Revisa la sintaxis antes de guardar.');
        return false;
      }
    } else {
      if (!editorSourceContent) {
        notify.error('No hay contenido base para el modo visual');
        return false;
      }

      parsedContent = buildVisualContent(editorSourceContent, editorVisualEntries);
    }

    setEditorBusy(true);
    try {
      const updated = await apiRequest<TranslationFileDetail>(
        `/projects/${projectId}/translation-files/${editorFileId}/content`,
        {
          method: 'PATCH',
          auth: true,
          body: { content: parsedContent },
        },
      );

      setEditorFileMeta(updated);
      setEditorSourceContent(updated.content);
      setEditorVisualEntries(extractStringEntries(updated.content));
      setEditorJson(JSON.stringify(updated.content, null, 2));
      setEditorBaselineJson(JSON.stringify(updated.content, null, 2));

      await refreshEditorVersions(editorFileId);

      notify.success('Archivo guardado correctamente');
      await runAnalysis();
      return true;
    } catch {
      notify.error('No se pudo guardar el archivo');
      return false;
    } finally {
      setEditorBusy(false);
    }
  };

  const saveVersionHistoryLimit = async () => {
    if (!projectId || !project || !canEditVersionHistoryLimit) {
      return;
    }

    const parsedLimit = Number.parseInt(versionHistoryLimitDraft, 10);
    if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 10) {
      notify.error('El límite debe estar entre 1 y 10');
      return;
    }

    if (parsedLimit === projectVersionHistoryLimit) {
      return;
    }

    setVersionHistoryLimitSaving(true);
    try {
      const updatedProject = await apiRequest<Project>(`/projects/${projectId}/version-history-limit`, {
        method: 'PATCH',
        auth: true,
        body: {
          versionHistoryLimit: parsedLimit,
        },
      });

      setProject(updatedProject);
      setVersionHistoryLimitDraft(String(updatedProject.versionHistoryLimit));

      if (editorFileId) {
        await refreshEditorVersions(editorFileId);
      }

      notify.success('Ajuste guardado correctamente');
    } catch {
      notify.error('No se pudo guardar el ajuste');
    } finally {
      setVersionHistoryLimitSaving(false);
    }
  };

  const cloneEditorFileToLanguage = async (clearValues: boolean) => {
    if (!projectId || !editorFileId || !editorTargetLanguageId) {
      notify.error('Selecciona un idioma destino');
      return;
    }

    setEditorBusy(true);
    try {
      const cloned = await apiRequest<TranslationFileSummary>(`/projects/${projectId}/translation-files/clone`, {
        method: 'POST',
        auth: true,
        body: {
          sourceTranslationFileId: editorFileId,
          targetLanguageId: editorTargetLanguageId,
          clearValues,
        },
      });

      notify.success(
        clearValues ? `Estructura creada en ${cloned.language.code}` : `Archivo clonado en ${cloned.language.code}`,
      );
      await load();
      await openEditorForFile(cloned.id);
    } catch {
      notify.error('No se pudo crear/actualizar el archivo destino');
    } finally {
      setEditorBusy(false);
    }
  };

  const translateEditorFileToLanguageWithAi = async () => {
    if (getCurrentUserTier() === 'FREE') {
      setProModalOpen(true);
      return;
    }

    if (!projectId || !editorFileId || !editorTargetLanguageId) {
      notify.error('Selecciona un idioma destino');
      return;
    }

    const targetLanguage = languages.find((language) => language.id === editorTargetLanguageId);
    if (!targetLanguage) {
      notify.error('No se encontró el idioma destino');
      return;
    }

    const sourceContent = getEditorContentSnapshot();
    if (!sourceContent) {
      return;
    }

    const sourceEntries = extractStringEntries(sourceContent).filter((entry) => entry.value.trim().length > 0);
    if (sourceEntries.length === 0) {
      notify.error('El archivo origen no tiene textos para traducir');
      return;
    }

    setEditorBusy(true);
    setAiSuggestBusy(true);

    try {
      const cloned = await apiRequest<TranslationFileSummary>(`/projects/${projectId}/translation-files/clone`, {
        method: 'POST',
        auth: true,
        body: {
          sourceTranslationFileId: editorFileId,
          targetLanguageId: editorTargetLanguageId,
          clearValues: true,
        },
      });

      const targetDetail = await apiRequest<TranslationFileDetail>(
        `/projects/${projectId}/translation-files/${cloned.id}`,
        { auth: true },
      );

      const chunkSize = 40;
      const suggestionsByKey = new Map<string, string>();

      for (let start = 0; start < sourceEntries.length; start += chunkSize) {
        const chunk = sourceEntries.slice(start, start + chunkSize);

        const batch = await apiRequest<AiBatchSuggestionsResponse>(`/projects/${projectId}/ai/suggestions/batch`, {
          method: 'POST',
          auth: true,
          body: {
            targetLanguageCode: targetLanguage.code,
            context: aiContext.trim() || undefined,
            glossary:
              aiGlossaryEntries.length > 0
                ? aiGlossaryEntries.map((entry) => ({
                    sourceTerm: entry.sourceTerm,
                    targetTerm: entry.targetTerm,
                    languageCodes: entry.languageCodes.length > 0 ? entry.languageCodes : undefined,
                  }))
                : undefined,
            items: chunk.map((entry) => ({
              key: entry.path,
              referenceText: entry.value,
              currentText: '',
            })),
          },
        });

        batch.suggestions.forEach((suggestion) => {
          if (suggestion.key && typeof suggestion.suggestion === 'string') {
            suggestionsByKey.set(suggestion.key, suggestion.suggestion);
          }
        });
      }

      const translatedContent = JSON.parse(JSON.stringify(targetDetail.content)) as Record<string, unknown>;

      suggestionsByKey.forEach((suggestion, key) => {
        setStringByPath(translatedContent, key, suggestion);
      });

      const updated = await apiRequest<TranslationFileDetail>(
        `/projects/${projectId}/translation-files/${cloned.id}/content`,
        {
          method: 'PATCH',
          auth: true,
          body: { content: translatedContent },
        },
      );

      notify.success(
        `Traducción IA completada: ${suggestionsByKey.size}/${sourceEntries.length} claves en ${updated.filename}`,
      );

      await load();
      await openEditorForFile(updated.id, { skipNotify: true });
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : '';
      if (message.includes('pro users only')) {
        setProModalOpen(true);
        return;
      }

      notify.error('No se pudo traducir el archivo completo con IA');
    } finally {
      setAiSuggestBusy(false);
      setEditorBusy(false);
    }
  };

  const getEditorContentSnapshot = (): Record<string, unknown> | null => {
    if (editorMode === 'RAW') {
      try {
        return JSON.parse(editorJson) as Record<string, unknown>;
      } catch {
        notify.error('El JSON actual no es valido y no se puede descargar.');
        return null;
      }
    }

    if (!editorSourceContent) {
      notify.error('No hay contenido base para descargar este archivo.');
      return null;
    }

    return buildVisualContent(editorSourceContent, editorVisualEntries);
  };

  const editorCurrentSnapshotJson = useMemo(() => {
    if (!editorFileId) {
      return '';
    }

    if (editorMode === 'RAW') {
      return editorJson;
    }

    if (!editorSourceContent) {
      return '';
    }

    return JSON.stringify(buildVisualContent(editorSourceContent, editorVisualEntries), null, 2);
  }, [editorFileId, editorMode, editorJson, editorSourceContent, editorVisualEntries]);

  const editorHasChanges = Boolean(editorFileId) && editorCurrentSnapshotJson !== editorBaselineJson;

  const downloadBlob = (filename: string, data: Blob) => {
    const url = URL.createObjectURL(data);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const downloadCurrentEditedFile = () => {
    if (!editorFileMeta || !editorFileId) {
      notify.error('Abre un archivo en el editor antes de descargar.');
      return;
    }

    const content = getEditorContentSnapshot();
    if (!content) return;

    const jsonText = JSON.stringify(content, null, 2);
    const blob = new Blob([jsonText], { type: 'application/json;charset=utf-8' });
    downloadBlob(editorFileMeta.filename, blob);
    notify.success(`Descargado: ${editorFileMeta.filename}`);
  };

  const downloadProjectZip = async () => {
    if (!projectId || translationFiles.length === 0) {
      notify.error('No hay archivos para exportar en este proyecto.');
      return;
    }

    setDownloadBusy(true);
    try {
      const details = await Promise.all(
        translationFiles.map((file) =>
          apiRequest<TranslationFileDetail>(`/projects/${projectId}/translation-files/${file.id}`, { auth: true }),
        ),
      );

      const zip = new JSZip();
      details.forEach((file) => {
        const safeFilename = file.filename.endsWith('.json') ? file.filename : `${file.filename}.json`;
        const zipPath = `${file.language.code}/${file.fileGroup.name}/${safeFilename}`;
        zip.file(zipPath, JSON.stringify(file.content, null, 2));
      });

      const projectSlug = (project?.name ?? 'proyecto')
        .toLowerCase()
        .replace(/[^a-z0-9-_]+/gi, '_')
        .replace(/^_+|_+$/g, '');

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      downloadBlob(`${projectSlug || 'proyecto'}_traducciones.zip`, zipBlob);
      notify.success('ZIP del proyecto descargado');
    } catch {
      notify.error('No se pudo generar el ZIP del proyecto');
    } finally {
      setDownloadBusy(false);
    }
  };

  const editorTargetLanguageOptions = languages.filter((language) => language.id !== editorFileMeta?.language.id);
  const selectedTargetLanguage = editorTargetLanguageOptions.find((language) => language.id === editorTargetLanguageId);

  const filteredVisualEntries = editorVisualEntries.filter((entry) => {
    if (!editorVisualQuery.trim()) {
      return true;
    }

    const q = editorVisualQuery.trim().toLowerCase();
    return entry.path.toLowerCase().includes(q) || entry.value.toLowerCase().includes(q);
  });

  const onChangeEditorMode = (mode: 'RAW' | 'VISUAL' | 'TREE') => {
    if (mode === 'VISUAL' || mode === 'TREE') {
      try {
        const parsed = JSON.parse(editorJson) as Record<string, unknown>;
        setEditorSourceContent(parsed);
        setEditorVisualEntries(extractStringEntries(parsed));
      } catch {
        notify.error('No puedes pasar a modo visual con JSON invalido');
        return;
      }
    }

    setEditorMode(mode);
  };

  const runAnalysis = async () => {
    if (!projectId) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await apiRequest<RunAnalysisResponse>(`/projects/${projectId}/analysis/run`, {
        method: 'POST',
        auth: true,
        body: {},
      });

      const loaded = await hydrateAnalysisFromReportMetas(result.reports);

      if (!loaded) {
        notify.info('El análisis no genero reportes');
        return;
      }

      notify.success(`Análisis completado: ${result.issuesCreated} issue(s) en ${result.reportsCreated} reporte(s)`);
    } catch {
      const message = 'No se pudo ejecutar el análisis';
      setError(message);
      notify.error(message);
    } finally {
      setLoading(false);
    }
  };

  const issueTypeLabel = (type: IssueType) => {
    if (type === 'MISSING_KEY') return 'Falta clave';
    if (type === 'INCORRECT_NESTING') return 'Anidado incorrecto';
    if (type === 'UNUSED_KEY') return 'Clave no usada';
    return 'Interpolacion distinta';
  };

  const issueTypeSeverity = (type: IssueType) => {
    if (type === 'MISSING_KEY') return 0;
    if (type === 'INCORRECT_NESTING') return 1;
    if (type === 'INTERPOLATION_MISMATCH') return 2;
    return 3;
  };

  const languageNameById = new Map(languages.map((language) => [language.id, language]));

  const issueTypeStats = {
    MISSING_KEY: (analysisReport?.issues ?? []).filter((issue) => issue.type === 'MISSING_KEY').length,
    UNUSED_KEY: (analysisReport?.issues ?? []).filter((issue) => issue.type === 'UNUSED_KEY').length,
    INTERPOLATION_MISMATCH: (analysisReport?.issues ?? []).filter((issue) => issue.type === 'INTERPOLATION_MISMATCH')
      .length,
    INCORRECT_NESTING: (analysisReport?.issues ?? []).filter((issue) => issue.type === 'INCORRECT_NESTING').length,
  };

  const filteredIssues = (analysisReport?.issues ?? []).filter((issue) => {
    const typeMatch = issueTypeFilter === 'ALL' || issue.type === issueTypeFilter;
    const languageMatch = issueLanguageFilter === 'ALL' || issue.languageId === issueLanguageFilter;
    return typeMatch && languageMatch;
  });

  const sortedFilteredIssues = [...filteredIssues].sort((a, b) => {
    const severityDiff = issueTypeSeverity(a.type) - issueTypeSeverity(b.type);
    if (severityDiff !== 0) {
      return severityDiff;
    }

    const typeDiff = issueTypeLabel(a.type).localeCompare(issueTypeLabel(b.type), 'es');
    if (typeDiff !== 0) {
      return typeDiff;
    }

    return a.key.localeCompare(b.key, 'es');
  });

  const resolvedIssueIds = useMemo<Set<string>>(() => {
    const resolved = new Set<string>(persistedResolvedIds);
    if (!editorFileMeta) return resolved;

    let entries = editorVisualEntries;
    let parsedRaw: unknown = null;
    if (editorMode === 'RAW') {
      try {
        parsedRaw = JSON.parse(editorJson) as unknown;
        entries = extractStringEntries(parsedRaw as Record<string, unknown>);
      } catch {
        // fallback to visual entries
      }
    }

    const currentMap = new Map(entries.map((e) => [e.path, e.value]));

    // Collect non-string leaf paths from the raw JSON (numbers, booleans, null)
    // so that keys with those values are also detected as "present".
    const nonStringPaths = new Set<string>();
    if (editorMode === 'RAW' && parsedRaw !== null) {
      const walkNonString = (val: unknown, prefix: string): void => {
        if (Array.isArray(val)) {
          val.forEach((item, i) => walkNonString(item, prefix ? `${prefix}.${i}` : String(i)));
        } else if (isPlainObject(val)) {
          Object.entries(val).forEach(([k, v]) => walkNonString(v, prefix ? `${prefix}.${k}` : k));
        } else if (prefix && typeof val !== 'string') {
          nonStringPaths.add(prefix);
        }
      };
      walkNonString(parsedRaw, '');
    }

    // Use the full issue list (not the filtered view) so resolution state is
    // independent of whatever filter the user has currently applied.
    for (const issue of (analysisReport?.issues ?? []) as AnalysisIssue[]) {
      const fileGroupId = reportGroupByReportId[issue.reportId];
      if (issue.languageId !== editorFileMeta.language.id || fileGroupId !== editorFileMeta.fileGroup.id) continue;
      if (issue.type === 'MISSING_KEY') {
        const val = currentMap.get(issue.key);
        const hasNonEmptyString = val !== undefined && val.trim() !== '';
        const hasNonStringValue = nonStringPaths.has(issue.key);
        if (hasNonEmptyString || hasNonStringValue) resolved.add(issue.id);
      } else if (issue.type === 'UNUSED_KEY') {
        if (!currentMap.has(issue.key)) resolved.add(issue.id);
      }
    }
    return resolved;
  }, [
    persistedResolvedIds,
    editorFileMeta,
    editorMode,
    editorVisualEntries,
    editorJson,
    analysisReport,
    reportGroupByReportId,
  ]);

  const currentFileIssues = useMemo(() => {
    if (!editorFileMeta) return [];
    return sortedFilteredIssues.filter((issue) => {
      const fileGroupId = reportGroupByReportId[issue.reportId];
      return issue.languageId === editorFileMeta.language.id && fileGroupId === editorFileMeta.fileGroup.id;
    });
  }, [editorFileMeta, sortedFilteredIssues, reportGroupByReportId]);

  const formatIssueDetails = (details: AnalysisReport['issues'][number]['details']) => {
    if (!details) {
      return 'Sin detalles adicionales';
    }

    return Object.entries(details)
      .map(([key, value]) => {
        if (Array.isArray(value)) {
          return `${key}: ${value.join(', ')}`;
        }

        if (typeof value === 'object' && value !== null) {
          return `${key}: ${JSON.stringify(value)}`;
        }

        return `${key}: ${String(value)}`;
      })
      .join(' | ');
  };

  const exportIssuesCsv = () => {
    if (sortedFilteredIssues.length === 0) {
      notify.error('No hay issues para exportar con los filtros actuales');
      return;
    }

    const rows = [
      ['clave', 'tipo', 'idioma', 'codigo', 'detalles'],
      ...sortedFilteredIssues.map((issue) => {
        const language = languageNameById.get(issue.languageId);
        return [
          issue.key,
          issueTypeLabel(issue.type),
          language?.name ?? issue.languageId,
          language?.code ?? '-',
          formatIssueDetails(issue.details),
        ];
      }),
    ];

    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const reportName = analysisReport?.fileGroup?.name ?? 'reporte';
    link.href = url;
    link.download = `issues_${reportName}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    notify.success(`CSV exportado: ${link.download}`);
  };

  const findIssueTargetFile = (issue: AnalysisReport['issues'][number]) => {
    const fileGroupId = reportGroupByReportId[issue.reportId];
    const targetLanguageForIssue = issue.languageId;
    return (
      translationFiles.find(
        (file) => file.language.id === targetLanguageForIssue && (!fileGroupId || file.fileGroup.id === fileGroupId),
      ) ??
      translationFiles.find((file) => file.language.id === issue.languageId) ??
      null
    );
  };

  const goToIssueInEditor = async (issue: AnalysisReport['issues'][number]) => {
    const targetFile = findIssueTargetFile(issue);

    if (!targetFile) {
      notify.error('No se encontro archivo para este issue en el idioma seleccionado');
      return;
    }

    // Si estamos en un archivo diferente y hay cambios, pedir confirmación
    if (editorFileId && editorFileId !== targetFile.id && editorHasChanges) {
      setPendingIssue(issue);
      setGoToIssueModalOpen(true);
      return;
    }

    // Proceder a navegar al issue
    await navigateToIssue(issue, targetFile);
  };

  const navigateToIssue = async (issue: AnalysisReport['issues'][number], targetFile: TranslationFileSummary) => {
    setActiveIssueId(issue.id);

    // Keep editor in VISUAL during issue navigation to avoid mode flicker.
    setEditorMode('VISUAL');
    setHighlightedRawLine(null);
    setEditorVisualQuery(issue.key);

    let openedContent: Record<string, unknown> | null = null;

    if (editorFileId === targetFile.id) {
      if (editorMode === 'RAW') {
        try {
          openedContent = JSON.parse(editorJson) as Record<string, unknown>;
        } catch {
          openedContent = editorSourceContent;
        }
      } else if (editorSourceContent) {
        openedContent = buildVisualContent(editorSourceContent, editorVisualEntries);
      }
    }

    if (!openedContent) {
      const opened = await openEditorForFile(targetFile.id, {
        initialVisualQuery: issue.key,
        skipNotify: true,
      });
      if (!opened) {
        return;
      }

      openedContent = opened.content;
    }

    const entryPaths = extractStringEntries(openedContent).map((entry) => entry.path);
    const matchedPath = findBestMatchingPath(issue.key, entryPaths);

    if (matchedPath) {
      setEditorVisualQuery(matchedPath);
      setHighlightedIssuePath(matchedPath);
    } else {
      setEditorVisualQuery(issue.key);
      setHighlightedIssuePath(null);
    }

    setActiveSection('editor');
    notify.success(
      matchedPath
        ? `Abierto ${targetFile.filename} y foco en ${matchedPath}`
        : `Abierto ${targetFile.filename} y filtro aplicado para ${issue.key}`,
    );
  };

  const restoreEditorVersion = async (versionId: string) => {
    if (!projectId || !editorFileId) {
      return;
    }

    setEditorBusy(true);
    try {
      const restored = await apiRequest<TranslationFileDetail>(
        `/projects/${projectId}/translation-files/${editorFileId}/versions/${versionId}/restore`,
        {
          method: 'PATCH',
          auth: true,
          body: {},
        },
      );

      setEditorFileMeta(restored);
      setEditorSourceContent(restored.content);
      setEditorVisualEntries(extractStringEntries(restored.content));
      setEditorJson(JSON.stringify(restored.content, null, 2));

      try {
        const versions = await apiRequest<TranslationFileVersionSummary[]>(
          `/projects/${projectId}/translation-files/${editorFileId}/versions`,
          { auth: true },
        );
        setEditorVersions(versions);
      } catch {
        setEditorVersions([]);
      }

      notify.success('Versión restaurada correctamente');
      await load();
    } catch {
      notify.error('No se pudo restaurar la versión');
    } finally {
      setEditorBusy(false);
    }
  };

  const viewEditorVersion = async (versionId: string) => {
    if (!projectId || !editorFileId) {
      return null;
    }

    try {
      const response = await apiRequest<{
        id: string;
        versionNumber: number;
        content: Record<string, unknown>;
      }>(`/projects/${projectId}/translation-files/${editorFileId}/versions/${versionId}`, { auth: true });
      return response.content;
    } catch {
      notify.error('No se pudo cargar la versión');
      return null;
    }
  };

  const requestAiSuggestions = async () => {
    if (getCurrentUserTier() === 'FREE') {
      setProModalOpen(true);
      return;
    }

    if (!projectId || !editorFileMeta) {
      notify.error('Abre un archivo en el editor antes de pedir sugerencias IA');
      return;
    }

    if (!analysisReport) {
      notify.error('Ejecuta análisis antes de pedir sugerencias IA');
      return;
    }

    let baseContent: Record<string, unknown>;
    if (editorMode === 'RAW') {
      try {
        baseContent = JSON.parse(editorJson) as Record<string, unknown>;
      } catch {
        notify.error('El JSON RAW no es válido. Corrígelo antes de usar IA.');
        return;
      }
    } else {
      if (!editorSourceContent) {
        notify.error('No hay contenido base para sugerencias IA');
        return;
      }

      baseContent = buildVisualContent(editorSourceContent, editorVisualEntries);
    }

    const entries = extractStringEntries(baseContent);
    const currentByKey = new Map(entries.map((entry) => [entry.path, entry.value]));

    const issueScopeFilter = (issue: AnalysisReport['issues'][number]) => {
      if (issue.languageId !== editorFileMeta.language.id) {
        return false;
      }

      if (aiSuggestionScope === 'CURRENT_FILE_ISSUES') {
        return reportGroupByReportId[issue.reportId] === editorFileMeta.fileGroup.id;
      }

      if (aiSuggestionScope === 'ALL_FILES_BY_TYPE') {
        return issue.type === aiSuggestionIssueTypeFilter;
      }

      return true;
    };

    const issueScopedItems = analysisReport.issues
      .filter(issueScopeFilter)
      .filter(
        (issue) =>
          issue.type === 'MISSING_KEY' || issue.type === 'INTERPOLATION_MISMATCH' || issue.type === 'INCORRECT_NESTING',
      )
      .map((issue) => {
        const referenceFromIssue =
          typeof issue.details?.referenceValue === 'string' ? issue.details.referenceValue : '';
        const fallbackReference = currentByKey.get(issue.key) ?? '';
        const referenceText = referenceFromIssue || fallbackReference;
        const issueFileGroupId = reportGroupByReportId[issue.reportId];
        const issueFileGroupName =
          reportGroupNameByReportId[issue.reportId] ||
          (issueFileGroupId === editorFileMeta.fileGroup.id ? editorFileMeta.fileGroup.name : 'Otro grupo');

        const currentText =
          issue.type === 'INCORRECT_NESTING' && typeof issue.details?.foundValue === 'string'
            ? issue.details.foundValue
            : (currentByKey.get(issue.key) ?? '');

        return {
          key: issue.key,
          referenceText,
          currentText,
          issueType: issue.type,
          fileGroupId: issueFileGroupId,
          fileGroupName: issueFileGroupName,
        };
      })
      .filter((item) => item.referenceText.trim() !== '');

    const deduped = Array.from(new Map(issueScopedItems.map((item) => [item.key, item])).values());

    if (deduped.length === 0) {
      notify.error('No hay issues compatibles para sugerencias IA en este archivo');
      return;
    }

    const limited = deduped.slice(0, 40);
    setAiSuggestBusy(true);
    try {
      const result = await apiRequest<AiBatchSuggestionsResponse>(`/projects/${projectId}/ai/suggestions/batch`, {
        method: 'POST',
        auth: true,
        body: {
          targetLanguageCode: editorFileMeta.language.code,
          context: aiContext.trim() || undefined,
          glossary:
            aiGlossaryEntries.length > 0
              ? aiGlossaryEntries.map((entry) => ({
                  sourceTerm: entry.sourceTerm,
                  targetTerm: entry.targetTerm,
                  languageCodes: entry.languageCodes.length > 0 ? entry.languageCodes : undefined,
                }))
              : undefined,
          items: limited.map((item) => ({
            key: item.key,
            referenceText: item.referenceText,
            currentText: item.currentText,
          })),
        },
      });

      const candidates: AiSuggestionCandidate[] = result.suggestions
        .filter((item) => item.key && typeof item.suggestion === 'string' && item.suggestion.trim() !== '')
        .map((item, index) => {
          const source = limited.find((candidate) => candidate.key === item.key);
          const targetFile = source?.fileGroupId
            ? translationFiles.find(
                (file) => file.language.id === editorFileMeta.language.id && file.fileGroup.id === source.fileGroupId,
              )
            : null;
          const sameFileGroup = source?.fileGroupId === editorFileMeta.fileGroup.id;
          const existsInCurrentFile = currentByKey.has(item.key);
          const applicableToCurrentFile = sameFileGroup || existsInCurrentFile;

          return {
            id: `${source?.fileGroupId ?? 'unknown'}:${item.key}:${index}`,
            key: item.key,
            currentText: currentByKey.get(item.key) ?? '',
            suggestion: item.suggestion,
            reason: item.reason,
            issueType: source?.issueType ?? 'MISSING_KEY',
            fileGroupId: source?.fileGroupId,
            fileGroupName: source?.fileGroupName ?? 'Otro grupo',
            targetTranslationFileId: targetFile?.id,
            targetFilename: targetFile?.filename,
            applicableToCurrentFile,
            selected: Boolean(targetFile),
          };
        });

      setAiSuggestions(candidates);

      notify.success(
        `IA lista para revisión: ${candidates.length} sugerencia(s)${deduped.length > limited.length ? ' (lote parcial)' : ''}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message.toLowerCase().includes('pro users only')) {
        setProModalOpen(true);
        return;
      }
      notify.error('No se pudieron obtener sugerencias IA');
    } finally {
      setAiSuggestBusy(false);
    }
  };

  const toggleAiSuggestion = (id: string) => {
    setAiSuggestions((prev) => prev.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item)));
  };

  const selectAllAiSuggestions = () => {
    setAiSuggestions((prev) => prev.map((item) => ({ ...item, selected: true })));
  };

  const clearAiSuggestions = () => {
    setAiSuggestions([]);
  };

  const addEntry = (path: string, value: string) => {
    if (!editorSourceContent) return;
    const current = buildVisualContent(editorSourceContent, editorVisualEntries);
    setStringByPath(current, path, value);
    setEditorSourceContent(current);
    setEditorVisualEntries(extractStringEntries(current));
    setEditorJson(JSON.stringify(current, null, 2));
  };

  const deleteEntry = (path: string) => {
    if (!editorSourceContent) return;
    const current = buildVisualContent(editorSourceContent, editorVisualEntries);
    deleteKeyByPath(current, path);
    setEditorSourceContent(current);
    setEditorVisualEntries(extractStringEntries(current));
    setEditorJson(JSON.stringify(current, null, 2));
  };

  const fixIncorrectNestingIssue = async (issue: AnalysisIssue) => {
    if (!projectId) {
      return;
    }

    const foundPath = typeof issue.details?.foundPath === 'string' ? issue.details.foundPath : '';
    const expectedPath = typeof issue.details?.expectedPath === 'string' ? issue.details.expectedPath : issue.key;

    if (!foundPath || !expectedPath) {
      notify.error('No se pudo determinar la ruta correcta para ese issue');
      return;
    }

    const targetFile = findIssueTargetFile(issue);
    if (!targetFile) {
      notify.error('No se encontró el archivo de destino para ese issue');
      return;
    }

    setActiveIssueId(issue.id);
    setActiveSection('editor');

    let sourceContent: Record<string, unknown> | null = null;
    let fileId = targetFile.id;

    if (editorFileId === targetFile.id) {
      if (editorMode === 'RAW') {
        try {
          sourceContent = JSON.parse(editorJson) as Record<string, unknown>;
        } catch {
          notify.error('El JSON actual no es valido y no se puede corregir ese issue');
          return;
        }
      } else if (editorSourceContent) {
        sourceContent = buildVisualContent(editorSourceContent, editorVisualEntries);
      }
    } else {
      const opened = await openEditorForFile(targetFile.id, {
        initialVisualQuery: expectedPath,
        skipNotify: true,
      });

      if (!opened) {
        return;
      }

      sourceContent = JSON.parse(JSON.stringify(opened.content)) as Record<string, unknown>;
      fileId = opened.id;
    }

    if (!sourceContent) {
      notify.error('No se pudo cargar el contenido del archivo para corregir el issue');
      return;
    }

    const movedValue = getValueByPath(sourceContent, foundPath);

    if (typeof movedValue !== 'string') {
      notify.error('No se encontró un valor de texto en la ruta mal anidada');
      return;
    }

    deleteKeyByPath(sourceContent, foundPath);
    setStringByPath(sourceContent, expectedPath, movedValue);

    setEditorBusy(true);
    try {
      const updated = await apiRequest<TranslationFileDetail>(
        `/projects/${projectId}/translation-files/${fileId}/content`,
        {
          method: 'PATCH',
          auth: true,
          body: { content: sourceContent },
        },
      );

      setEditorFileId(updated.id);
      setEditorFileMeta(updated);
      setEditorSourceContent(updated.content);
      setEditorVisualEntries(extractStringEntries(updated.content));
      setEditorJson(JSON.stringify(updated.content, null, 2));
      setEditorBaselineJson(JSON.stringify(updated.content, null, 2));
      setPersistedResolvedIds((prev) => new Set(prev).add(issue.id));
      setHighlightedIssuePath(expectedPath);
      setEditorVisualQuery(expectedPath);

      await runAnalysis();

      notify.success('Clave reubicada en su ruta correcta y marcada como resuelta');
    } catch {
      notify.error('No se pudo corregir el issue de anidado');
    } finally {
      setEditorBusy(false);
    }
  };

  const applySelectedAiSuggestions = async () => {
    if (aiSuggestions.length === 0) {
      notify.error('No hay sugerencias IA para aplicar');
      return;
    }

    if (!projectId || !editorFileId) {
      notify.error('Abre un archivo en el editor antes de aplicar sugerencias IA');
      return;
    }

    const selected = aiSuggestions.filter((item) => item.selected && item.targetTranslationFileId);

    if (selected.length === 0) {
      notify.error('No hay sugerencias seleccionadas con archivo destino');
      return;
    }

    const suggestionsByFile = selected.reduce<Map<string, AiSuggestionCandidate[]>>((acc, suggestion) => {
      const fileId = suggestion.targetTranslationFileId;
      if (!fileId) return acc;
      const bucket = acc.get(fileId);
      if (bucket) {
        bucket.push(suggestion);
      } else {
        acc.set(fileId, [suggestion]);
      }
      return acc;
    }, new Map());

    let baseContent: Record<string, unknown> | null = null;
    if (suggestionsByFile.has(editorFileId)) {
      if (editorMode === 'RAW') {
        try {
          baseContent = JSON.parse(editorJson) as Record<string, unknown>;
        } catch {
          notify.error('El JSON RAW no es válido. Corrígelo antes de aplicar sugerencias al archivo abierto.');
          return;
        }
      } else {
        if (!editorSourceContent) {
          notify.error('No hay contenido base para aplicar sugerencias en el archivo abierto');
          return;
        }

        baseContent = buildVisualContent(editorSourceContent, editorVisualEntries);
      }
    }

    setEditorBusy(true);
    try {
      const appliedSummary: Array<{ filename: string; count: number }> = [];
      const failedFiles: string[] = [];

      for (const [fileId, fileSuggestions] of suggestionsByFile.entries()) {
        try {
          let baseFileContent: Record<string, unknown>;

          if (fileId === editorFileId) {
            if (!baseContent) {
              throw new Error('Missing base content for editor file');
            }
            baseFileContent = JSON.parse(JSON.stringify(baseContent)) as Record<string, unknown>;
          } else {
            const targetFile = await apiRequest<TranslationFileDetail>(
              `/projects/${projectId}/translation-files/${fileId}`,
              { auth: true },
            );
            baseFileContent = JSON.parse(JSON.stringify(targetFile.content)) as Record<string, unknown>;
          }

          fileSuggestions.forEach((suggestion) => {
            setStringByPath(baseFileContent, suggestion.key, suggestion.suggestion);
          });

          const updated = await apiRequest<TranslationFileDetail>(
            `/projects/${projectId}/translation-files/${fileId}/content`,
            {
              method: 'PATCH',
              auth: true,
              body: { content: baseFileContent },
            },
          );

          if (fileId === editorFileId) {
            setEditorFileMeta(updated);
            setEditorSourceContent(updated.content);
            setEditorVisualEntries(extractStringEntries(updated.content));
            setEditorJson(JSON.stringify(updated.content, null, 2));
          }

          appliedSummary.push({
            filename: updated.filename,
            count: fileSuggestions.length,
          });
        } catch {
          const fallbackName = fileSuggestions[0]?.targetFilename ?? `archivo ${fileId}`;
          failedFiles.push(fallbackName);
        }
      }

      setAiSuggestions([]);

      if (appliedSummary.length > 0) {
        const summaryText = appliedSummary.map((entry) => `${entry.filename}: ${entry.count} issue(s)`).join(' · ');
        notify.success(`Sugerencias IA aplicadas y guardadas: ${summaryText}`);
        await load();
      }

      if (failedFiles.length > 0) {
        notify.error(`No se pudieron guardar ${failedFiles.length} archivo(s): ${failedFiles.join(', ')}`);
      }
    } finally {
      setEditorBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title={project ? project.name : 'Proyecto'}
        subtitle="Gestión de idiomas y carga inicial de traducciones"
      />

      <main className="mx-auto w-full max-w-6xl px-4 pb-24 md:px-6 lg:pb-6">
        <div className="lg:hidden">
          <div className="fixed bottom-3 left-1/2 z-30 w-[calc(100%-1.5rem)] -translate-x-1/2 rounded-2xl border border-zinc-200 bg-white/95 p-1.5 shadow-lg backdrop-blur">
            <SectionNavMobile activeSection={activeSection} onSelect={setActiveSection} />
          </div>
        </div>

        <div className="mt-4 lg:pl-72">
          {error ? (
            <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          ) : null}

          <aside className="fixed left-6 top-24 z-20 hidden w-64 lg:block">
            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
              <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Secciones</p>
              <SectionNavSidebar activeSection={activeSection} onSelect={setActiveSection} />
            </div>
          </aside>

          <section className="py-1">
            <div className={`${activeSection === 'overview' ? 'block' : 'hidden'}`}>
              <OverviewSection
                patternLabel={project ? PATTERN_LABELS[project.i18nPattern] : '-'}
                languagesCount={languages.length}
                translationFilesCount={translationFiles.length}
                issuesCount={analysisReport?.issues.length ?? 0}
                referenceLanguageName={
                  project?.referenceLanguageId
                    ? `${languageNameById.get(project.referenceLanguageId)?.name ?? 'Configurado'}`
                    : 'Sin definir'
                }
                issueTypeStats={issueTypeStats}
                versionHistoryLimit={projectVersionHistoryLimit}
                versionHistoryLimitDraft={versionHistoryLimitDraft}
                versionHistoryLimitSaving={versionHistoryLimitSaving}
                canEditVersionHistoryLimit={canEditVersionHistoryLimit}
                onVersionHistoryLimitDraftChange={setVersionHistoryLimitDraft}
                onSaveVersionHistoryLimit={saveVersionHistoryLimit}
              />
            </div>

            <div className={`${activeSection === 'team' ? 'block' : 'hidden'} mt-2`}>
              <TeamSection
                members={teamMembers}
                currentUserId={currentUserId}
                canManageTeam={canManageTeam}
                memberEmail={memberEmail}
                memberRole={memberRole}
                loading={teamLoading}
                canLeaveProject={canLeaveProject}
                onMemberEmailChange={setMemberEmail}
                onMemberRoleChange={setMemberRole}
                onAddMember={onAddMember}
                onUpdateMemberRole={onUpdateMemberRole}
                onRequestRemoveMember={setMemberToRemove}
                onRequestTransferOwnership={setMemberToTransfer}
                onLeaveProject={leaveProject}
              />
            </div>

            <div className={`${activeSection === 'languages' ? 'block' : 'hidden'} mt-2`}>
              <LanguagesSection
                languages={languages}
                referenceLanguageId={project?.referenceLanguageId}
                languageCoverageByLanguageId={languageCoverageByLanguageId}
                code={code}
                name={name}
                loading={loading}
                onCodeChange={setCode}
                onNameChange={setName}
                onAddLanguage={onAddLanguage}
                onSetReference={setReference}
                onEditLanguage={openLanguageEditModal}
                onDeleteLanguage={setLanguageToDelete}
              />
            </div>

            <div className={`${activeSection === 'upload' ? 'block' : 'hidden'}`}>
              <UploadSection
                pattern={project?.i18nPattern}
                hasConfiguredLanguages={hasConfiguredLanguages}
                isDraggingFiles={isDraggingFiles}
                ingestFiles={ingestFiles}
                translationFiles={translationFiles}
                loading={loading}
                onDropFiles={onDropFiles}
                onDragOverFiles={onDragOverFiles}
                onDragLeaveFiles={onDragLeaveFiles}
                onPickFiles={onPickFiles}
                onIngest={onIngest}
                onGoToLanguages={() => setActiveSection('languages')}
                onEditFile={(fileId) => {
                  void openEditorForFile(fileId);
                }}
                onDeleteFile={setFileToDelete}
              />
            </div>

            <div className={`${activeSection === 'editor' ? 'block' : 'hidden'} mt-2`}>
              <EditorSection
                translationFiles={translationFiles}
                editorFileId={editorFileId}
                editorFileMeta={editorFileMeta}
                editorMode={editorMode}
                editorBusy={editorBusy}
                editorJson={editorJson}
                editorVisualQuery={editorVisualQuery}
                filteredVisualEntries={filteredVisualEntries}
                editorTargetLanguageId={editorTargetLanguageId}
                editorTargetLanguageOptions={editorTargetLanguageOptions}
                editorCloneMode={editorCloneMode}
                selectedTargetLanguage={selectedTargetLanguage}
                downloadBusy={downloadBusy}
                onSelectEditorFile={(value) => {
                  void openEditorForFile(value);
                }}
                onResetEditorSelection={() => {
                  setEditorFileId(null);
                  setEditorFileMeta(null);
                  setEditorSourceContent(null);
                  setEditorVisualEntries([]);
                  setEditorVisualQuery('');
                  setEditorJson('');
                  setEditorBaselineJson('');
                  setEditorTargetLanguageId('');
                  setEditorCloneMode('EMPTY_STRUCTURE');
                  setEditorVersions([]);
                  setEditorVersionsLoading(false);
                  setAiSuggestions([]);
                  setCloneConfirmOpen(false);
                }}
                onChangeEditorMode={onChangeEditorMode}
                onSaveEditorFile={saveEditorFile}
                onEditorJsonChange={setEditorJson}
                onEditorVisualQueryChange={setEditorVisualQuery}
                highlightedVisualPath={highlightedIssuePath}
                highlightedRawLine={highlightedRawLine}
                onDismissHighlightedVisualPath={() => setHighlightedIssuePath(null)}
                onDismissHighlightedRawLine={() => setHighlightedRawLine(null)}
                onEditorVisualEntryChange={(path, value) => {
                  setEditorVisualEntries((prev) =>
                    prev.map((item) => (item.path === path ? { ...item, value } : item)),
                  );
                }}
                onDownloadCurrentEditedFile={downloadCurrentEditedFile}
                onDownloadProjectZip={downloadProjectZip}
                onTargetLanguageChange={setEditorTargetLanguageId}
                onCloneModeChange={setEditorCloneMode}
                onCloneEmptyStructure={() => {
                  void cloneEditorFileToLanguage(true);
                }}
                onRequestCopyContent={() => setCloneConfirmOpen(true)}
                onTranslateFullWithAi={translateEditorFileToLanguageWithAi}
                sortedIssues={sortedFilteredIssues}
                activeIssueId={activeIssueId}
                resolvedIssueIds={resolvedIssueIds}
                languageNameById={languageNameById}
                onGoToIssue={goToIssueInEditor}
                isPro={isPro}
                onVersionHistoryProGate={() => setProModalOpen(true)}
                versions={editorVersions}
                versionsLoading={editorVersionsLoading}
                onRestoreVersion={restoreEditorVersion}
                onViewVersion={viewEditorVersion}
                aiSuggestBusy={aiSuggestBusy}
                onRequestAiSuggestions={requestAiSuggestions}
                aiSuggestions={aiSuggestions}
                aiSuggestionScope={aiSuggestionScope}
                onAiSuggestionScopeChange={setAiSuggestionScope}
                aiSuggestionIssueTypeFilter={aiSuggestionIssueTypeFilter}
                onAiSuggestionIssueTypeFilterChange={setAiSuggestionIssueTypeFilter}
                onToggleAiSuggestion={toggleAiSuggestion}
                onSelectAllAiSuggestions={selectAllAiSuggestions}
                onClearAiSuggestions={clearAiSuggestions}
                onApplySelectedAiSuggestions={applySelectedAiSuggestions}
                editorVisualEntries={editorVisualEntries}
                treeReferenceEntries={editorReferenceEntries}
                showReferenceOverlay={showReferenceOverlay}
                onShowReferenceOverlayChange={setShowReferenceOverlay}
                currentFileIssues={currentFileIssues}
                onAddEntry={addEntry}
                onDeleteEntry={deleteEntry}
                onFixIncorrectNesting={fixIncorrectNestingIssue}
                editorHasChanges={editorHasChanges}
              />
            </div>

            <div className={`${activeSection === 'ai-context' ? 'block' : 'hidden'} mt-2`}>
              <AiContextSection
                isPro={isPro}
                aiContext={aiContext}
                contextSaving={aiContextSaving}
                onAiContextChange={setAiContext}
                languages={languages}
                glossaryEntries={aiGlossaryEntries}
                onAddGlossaryEntry={(entry) => {
                  setAiGlossaryEntries((previous) => [
                    ...previous,
                    {
                      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                      ...entry,
                    },
                  ]);
                }}
                onUpdateGlossaryEntry={(id, patch) => {
                  setAiGlossaryEntries((previous) =>
                    previous.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)),
                  );
                }}
                onRemoveGlossaryEntry={(id) => {
                  setAiGlossaryEntries((previous) => previous.filter((entry) => entry.id !== id));
                }}
              />
            </div>

            <div className={`${activeSection === 'analysis' ? 'block' : 'hidden'} mt-2`}>
              <AnalysisSection
                loading={loading}
                analysisReport={analysisReport}
                languages={languages}
                issueTypeFilter={issueTypeFilter}
                issueLanguageFilter={issueLanguageFilter}
                issueTypeStats={issueTypeStats}
                sortedFilteredIssues={sortedFilteredIssues}
                expandedIssueId={expandedIssueId}
                projectHasReference={Boolean(project?.referenceLanguageId)}
                languageNameById={languageNameById}
                fileGroupNameByReportId={reportGroupNameByReportId}
                isPro={isPro}
                onRunAnalysis={runAnalysis}
                onLoadLatestAnalysis={() => void loadLatestAnalysis(false)}
                onExportIssuesCsv={exportIssuesCsv}
                onRequestAiSuggestions={() => {
                  setActiveSection('editor');
                  setAiSuggestionScope('ALL_FILES_ISSUES');
                  if (editorFileId) {
                    void requestAiSuggestions();
                    return;
                  }
                  notify.info('Abre un archivo en el editor para lanzar las sugerencias IA');
                }}
                onViewQualityAnalysis={() => setActiveSection('quality-review')}
                onIssueTypeFilterChange={setIssueTypeFilter}
                onIssueLanguageFilterChange={setIssueLanguageFilter}
                onClearIssueFilters={() => {
                  setIssueTypeFilter('ALL');
                  setIssueLanguageFilter('ALL');
                }}
                onToggleIssueExpanded={setExpandedIssueId}
                onGoToIssue={goToIssueInEditor}
                issueTypeLabel={issueTypeLabel}
                formatIssueDetails={formatIssueDetails}
              />
            </div>

            <div className={`${activeSection === 'quality-review' ? 'block' : 'hidden'} mt-2`}>
              <QualityReviewSection
                projectId={projectId ?? ''}
                translationFiles={translationFiles}
                languages={languages}
                referenceLanguageId={project?.referenceLanguageId}
              />
            </div>

            <div className={`${activeSection === 'integrations' ? 'block' : 'hidden'} mt-2`}>
              <IntegrationsSection projectId={projectId ?? ''} />
            </div>
          </section>
        </div>

        <ConfirmModal
          open={Boolean(fileToDelete)}
          onOpenChange={(open) => !open && setFileToDelete(null)}
          title="Eliminar archivo"
          description={`Vas a eliminar "${fileToDelete?.filename ?? ''}" (${fileToDelete?.language.code ?? ''}). Esta accion no se puede deshacer.`}
          confirmLabel="Eliminar"
          onConfirm={removeTranslationFile}
        />

        <ConfirmModal
          open={Boolean(languageToDelete)}
          onOpenChange={(open) => !open && setLanguageToDelete(null)}
          title="Eliminar idioma"
          description={`Vas a eliminar ${languageToDelete?.name ?? 'este idioma'} (${languageToDelete?.code ?? ''}). Se eliminaran sus traducciones asociadas y, si era referencia, el proyecto quedara sin idioma de referencia.`}
          confirmLabel="Eliminar idioma"
          onConfirm={removeLanguage}
        />

        <ConfirmModal
          open={Boolean(memberToRemove)}
          onOpenChange={(open) => !open && setMemberToRemove(null)}
          title="Eliminar miembro"
          description={`Vas a eliminar a ${memberToRemove?.name ?? 'este miembro'} (${memberToRemove?.email ?? ''}) del proyecto.`}
          confirmLabel="Eliminar miembro"
          onConfirm={removeMember}
        />

        <ConfirmModal
          open={Boolean(memberToTransfer)}
          onOpenChange={(open) => !open && setMemberToTransfer(null)}
          title="Transferir ownership"
          description={`Vas a transferir el ownership a ${memberToTransfer?.name ?? 'este miembro'} (${memberToTransfer?.email ?? ''}). Dejaras de tener permisos de owner.`}
          confirmLabel="Transferir ownership"
          confirmVariant="default"
          onConfirm={transferOwnership}
        />

        <ConfirmModal
          open={cloneConfirmOpen}
          onOpenChange={setCloneConfirmOpen}
          title="Confirmar copia de contenido"
          description={`Vas a copiar el contenido de ${editorFileMeta?.language.code ?? 'origen'} hacia ${selectedTargetLanguage?.code ?? 'destino'}. Si ese archivo ya existe, se sobrescribira.`}
          confirmLabel="Si, copiar contenido"
          onConfirm={() => {
            setCloneConfirmOpen(false);
            void cloneEditorFileToLanguage(false);
          }}
        />

        <Dialog open={proModalOpen} onOpenChange={setProModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Función exclusiva de cuentas PRO</DialogTitle>
              <DialogDescription>
                Las sugerencias con IA, el contexto de traducción y el historial de versiones son funciones exclusivas
                de cuentas PRO. Con tu cuenta actual puedes usar el análisis completo, el editor y las exportaciones sin
                límite.
              </DialogDescription>
            </DialogHeader>

            <DialogFooter>
              <Button type="button" onClick={() => setProModalOpen(false)}>
                Entendido
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={Boolean(languageToEdit)}
          onOpenChange={(open) => {
            if (open) return;
            setLanguageToEdit(null);
            setLanguageEditCode('');
            setLanguageEditName('');
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar idioma</DialogTitle>
              <DialogDescription>
                Actualiza el codigo y nombre del idioma. El codigo se guarda en minusculas.
              </DialogDescription>
            </DialogHeader>

            <form className="grid gap-3" onSubmit={updateLanguage}>
              <div>
                <label className="mb-1 block text-sm text-zinc-600">Codigo</label>
                <Input
                  value={languageEditCode}
                  onChange={(event) => setLanguageEditCode(event.target.value)}
                  placeholder="es"
                  required
                />
              </div>

              <div>
                <label className="mb-1 block text-sm text-zinc-600">Nombre</label>
                <Input
                  value={languageEditName}
                  onChange={(event) => setLanguageEditName(event.target.value)}
                  placeholder="Espanol"
                  required
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setLanguageToEdit(null);
                    setLanguageEditCode('');
                    setLanguageEditName('');
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={languageActionBusy}>
                  {languageActionBusy ? 'Guardando...' : 'Guardar cambios'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={languageMappingModalOpen} onOpenChange={setLanguageMappingModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Asignar idioma a archivos</DialogTitle>
              <DialogDescription>
                Algunos archivos no tienen el idioma detectable. Selecciona a qué idioma corresponde cada archivo antes
                de continuar.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-3">
              {Object.keys(languageMapping).map((path) => (
                <div key={path}>
                  <p className="mb-1 text-sm font-medium text-zinc-700 truncate">{path}</p>
                  <Select
                    value={languageMapping[path] ?? ''}
                    onChange={(e) => setLanguageMapping((prev) => ({ ...prev, [path]: e.target.value || null }))}
                  >
                    <option value="">Selecciona un idioma</option>
                    {languages.map((lang) => (
                      <option key={lang.id} value={lang.code}>
                        {lang.name} ({lang.code})
                      </option>
                    ))}
                  </Select>
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setLanguageMappingModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={applyLanguageMapping}
                disabled={Object.values(languageMapping).some((v) => !v)}
              >
                Aplicar mapeo
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog
          open={goToIssueModalOpen}
          onOpenChange={(open) => {
            if (!open) {
              setGoToIssueModalOpen(false);
              setPendingIssue(null);
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tienes cambios sin guardar</DialogTitle>
              <DialogDescription>
                Si cambias de archivo para ver este issue, puedes guardar primero o seguir sin guardar y perder los
                cambios actuales.
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setGoToIssueModalOpen(false);
                  setPendingIssue(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  const saved = await saveEditorFile();
                  if (saved && pendingIssue) {
                    const targetFile = findIssueTargetFile(pendingIssue);
                    if (targetFile) {
                      setGoToIssueModalOpen(false);
                      setPendingIssue(null);
                      await navigateToIssue(pendingIssue, targetFile);
                    }
                  }
                }}
                disabled={editorBusy}
              >
                Guardar y cambiar
              </Button>
              <Button
                type="button"
                onClick={() => {
                  if (pendingIssue) {
                    const targetFile = findIssueTargetFile(pendingIssue);
                    if (targetFile) {
                      setGoToIssueModalOpen(false);
                      setPendingIssue(null);
                      void navigateToIssue(pendingIssue, targetFile);
                    }
                  }
                }}
              >
                Cambiar sin guardar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </>
  );
}
