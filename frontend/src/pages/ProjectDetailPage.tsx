import JSZip from 'jszip';
import { ArrowLeft, FilePenLine, FileSearch, FileUp, Languages, Star } from 'lucide-react';
import type { ChangeEvent, DragEvent, FormEvent, ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import { AnalysisSection } from '../components/project-detail/AnalysisSection';
import { EditorSection } from '../components/project-detail/EditorSection';
import { LanguagesSection } from '../components/project-detail/LanguagesSection';
import { OverviewSection } from '../components/project-detail/OverviewSection';
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
import { apiRequest } from '../lib/api';
import { notify } from '../lib/toast';
import type {
  AnalysisReport,
  IngestResponse,
  IssueType,
  Language,
  Project,
  RunAnalysisResponse,
  TranslationFileDetail,
  TranslationFileSummary,
  TranslationFileVersionSummary,
} from '../lib/types';

type VisualEntry = {
  path: string;
  value: string;
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
  { id: 'languages', label: 'Idiomas' },
  { id: 'upload', label: 'Carga' },
  { id: 'editor', label: 'Editor' },
  { id: 'analysis', label: 'Análisis' },
] as const;

type SectionId = (typeof SECTION_ITEMS)[number]['id'];
type CloneMode = 'EMPTY_STRUCTURE' | 'COPY_CONTENT';

const sectionIconById: Record<SectionId, ReactNode> = {
  overview: <Star size={14} />,
  languages: <Languages size={14} />,
  upload: <FileUp size={14} />,
  editor: <FilePenLine size={14} />,
  analysis: <FileSearch size={14} />,
};

export function ProjectDetailPage() {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [translationFiles, setTranslationFiles] = useState<TranslationFileSummary[]>([]);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [ingestFiles, setIngestFiles] = useState<IngestFileItem[]>([]);
  const [analysisReport, setAnalysisReport] = useState<AnalysisReport | null>(null);
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
  const [editorMode, setEditorMode] = useState<'RAW' | 'VISUAL'>('RAW');
  const [editorSourceContent, setEditorSourceContent] = useState<Record<string, unknown> | null>(null);
  const [editorVisualEntries, setEditorVisualEntries] = useState<VisualEntry[]>([]);
  const [editorVisualQuery, setEditorVisualQuery] = useState('');
  const [editorJson, setEditorJson] = useState('');
  const [editorTargetLanguageId, setEditorTargetLanguageId] = useState('');
  const [editorCloneMode, setEditorCloneMode] = useState<CloneMode>('EMPTY_STRUCTURE');
  const [cloneConfirmOpen, setCloneConfirmOpen] = useState(false);
  const [editorVersions, setEditorVersions] = useState<TranslationFileVersionSummary[]>([]);
  const [editorVersionsLoading, setEditorVersionsLoading] = useState(false);
  const [aiSuggestBusy, setAiSuggestBusy] = useState(false);
  const [editorBusy, setEditorBusy] = useState(false);
  const [downloadBusy, setDownloadBusy] = useState(false);
  const [expandedIssueId, setExpandedIssueId] = useState<string | null>(null);
  const [activeIssueId, setActiveIssueId] = useState<string | null>(null);
  const [highlightedIssuePath, setHighlightedIssuePath] = useState<string | null>(null);
  const [highlightedRawLine, setHighlightedRawLine] = useState<number | null>(null);
  const [reportGroupByReportId, setReportGroupByReportId] = useState<Record<string, string>>({});
  const [reportGroupNameByReportId, setReportGroupNameByReportId] = useState<Record<string, string>>({});
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionId>('overview');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
    } catch {
      setIngestFiles([]);
      const message = 'Uno o varios archivos seleccionados no son JSON valido';
      setError(message);
      notify.error(message);
    }
  };

  const load = useCallback(async () => {
    if (!projectId) return;

    try {
      const [projectData, languagesData, filesData] = await Promise.all([
        apiRequest<Project>(`/projects/${projectId}`, { auth: true }),
        apiRequest<Language[]>(`/projects/${projectId}/languages`, { auth: true }),
        apiRequest<TranslationFileSummary[]>(`/projects/${projectId}/translation-files`, { auth: true }),
      ]);
      setProject(projectData);
      setLanguages(languagesData);
      setTranslationFiles(filesData);
    } catch {
      setError('No se pudo cargar el proyecto');
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

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

  const openEditorForFile = async (translationFileId: string) => {
    if (!projectId) return;

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
      setEditorVisualQuery('');
      setEditorMode('RAW');
      setEditorJson(JSON.stringify(file.content, null, 2));
      setEditorTargetLanguageId('');
      setEditorCloneMode('EMPTY_STRUCTURE');
      setCloneConfirmOpen(false);

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

      notify.success(`Archivo abierto en editor: ${file.filename}`);
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

  const findJsonLineForPath = (jsonText: string, path: string): number | null => {
    const segments = path.split('.').filter(Boolean);
    if (segments.length === 0) {
      return null;
    }

    const keyToken = `"${segments[segments.length - 1]}"`;
    const lines = jsonText.split('\n');
    const foundIndex = lines.findIndex((line) => line.includes(keyToken));
    if (foundIndex < 0) {
      return null;
    }

    return foundIndex + 1;
  };

  const saveEditorFile = async () => {
    if (!projectId || !editorFileId) return;

    let parsedContent: Record<string, unknown>;

    if (editorMode === 'RAW') {
      try {
        parsedContent = JSON.parse(editorJson) as Record<string, unknown>;
      } catch {
        notify.error('El JSON no es valido. Revisa la sintaxis antes de guardar.');
        return;
      }
    } else {
      if (!editorSourceContent) {
        notify.error('No hay contenido base para el modo visual');
        return;
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

      try {
        const versions = await apiRequest<TranslationFileVersionSummary[]>(
          `/projects/${projectId}/translation-files/${editorFileId}/versions`,
          { auth: true },
        );
        setEditorVersions(versions);
      } catch {
        setEditorVersions([]);
      }

      notify.success('Archivo guardado correctamente');
      await load();
    } catch {
      notify.error('No se pudo guardar el archivo');
    } finally {
      setEditorBusy(false);
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

  const onChangeEditorMode = (mode: 'RAW' | 'VISUAL') => {
    if (mode === 'VISUAL') {
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

      if (result.reports.length === 0) {
        setAnalysisReport(null);
        notify.info('El análisis no genero reportes');
        return;
      }

      const reports = await Promise.all(
        result.reports.map((reportMeta) =>
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
          result.reports.map((report) => [
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
    if (type === 'UNUSED_KEY') return 'Clave no usada';
    return 'Interpolacion distinta';
  };

  const issueTypeSeverity = (type: IssueType) => {
    if (type === 'MISSING_KEY') return 0;
    if (type === 'INTERPOLATION_MISMATCH') return 1;
    return 2;
  };

  const languageNameById = new Map(languages.map((language) => [language.id, language]));

  const issueTypeStats = {
    MISSING_KEY: (analysisReport?.issues ?? []).filter((issue) => issue.type === 'MISSING_KEY').length,
    UNUSED_KEY: (analysisReport?.issues ?? []).filter((issue) => issue.type === 'UNUSED_KEY').length,
    INTERPOLATION_MISMATCH: (analysisReport?.issues ?? []).filter((issue) => issue.type === 'INTERPOLATION_MISMATCH')
      .length,
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

  const activeIssueIndex = sortedFilteredIssues.findIndex((issue) => issue.id === activeIssueId);

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

  const goToIssueInEditor = async (issue: AnalysisReport['issues'][number]) => {
    setActiveIssueId(issue.id);

    const fileGroupId = reportGroupByReportId[issue.reportId];
    const targetLanguageForIssue = issue.languageId;
    const targetFile =
      translationFiles.find(
        (file) => file.language.id === targetLanguageForIssue && (!fileGroupId || file.fileGroup.id === fileGroupId),
      ) ?? translationFiles.find((file) => file.language.id === issue.languageId);

    if (!targetFile) {
      notify.error('No se encontro archivo para este issue en el idioma seleccionado');
      return;
    }

    const opened = await openEditorForFile(targetFile.id);
    if (!opened) {
      return;
    }

    const entryPaths = extractStringEntries(opened.content).map((entry) => entry.path);
    const matchedPath = findBestMatchingPath(issue.key, entryPaths);

    if (matchedPath) {
      setEditorMode('VISUAL');
      setEditorVisualQuery(matchedPath);
      setHighlightedIssuePath(null);
      setTimeout(() => setHighlightedIssuePath(matchedPath), 0);
      setHighlightedRawLine(null);
    } else if (issue.type === 'MISSING_KEY') {
      setEditorMode('VISUAL');
      setEditorVisualQuery(issue.key);
      setHighlightedIssuePath(null);
      setHighlightedRawLine(null);
    } else {
      const jsonText = JSON.stringify(opened.content, null, 2);
      const approxLine = findJsonLineForPath(jsonText, issue.key);
      setEditorMode('RAW');
      setEditorVisualQuery('');
      setHighlightedIssuePath(null);
      setHighlightedRawLine(approxLine);
    }

    setActiveSection('editor');
    notify.success(
      matchedPath
        ? `Abierto ${targetFile.filename} y foco en ${matchedPath}`
        : `Abierto ${targetFile.filename} en modo RAW para revisar ${issue.key}`,
    );
  };

  const goToPreviousIssue = () => {
    if (sortedFilteredIssues.length === 0) {
      return;
    }

    const startIndex = activeIssueIndex >= 0 ? activeIssueIndex : 0;
    const nextIndex = (startIndex - 1 + sortedFilteredIssues.length) % sortedFilteredIssues.length;
    void goToIssueInEditor(sortedFilteredIssues[nextIndex]);
  };

  const goToNextIssue = () => {
    if (sortedFilteredIssues.length === 0) {
      return;
    }

    const startIndex = activeIssueIndex >= 0 ? activeIssueIndex : -1;
    const nextIndex = (startIndex + 1 + sortedFilteredIssues.length) % sortedFilteredIssues.length;
    void goToIssueInEditor(sortedFilteredIssues[nextIndex]);
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

  const requestAiSuggestions = async () => {
    if (!projectId || !editorFileMeta) {
      notify.error('Abre un archivo en el editor antes de pedir sugerencias IA');
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
    if (entries.length === 0) {
      notify.error('No hay claves de texto para sugerir');
      return;
    }

    const limited = entries.slice(0, 40);
    setAiSuggestBusy(true);
    try {
      const result = await apiRequest<{
        count: number;
        suggestions: Array<{ key: string; suggestion: string; reason?: string }>;
      }>(`/projects/${projectId}/ai/suggestions/batch`, {
        method: 'POST',
        auth: true,
        body: {
          targetLanguageCode: editorFileMeta.language.code,
          items: limited.map((entry) => ({
            key: entry.path,
            referenceText: entry.value,
            currentText: entry.value,
          })),
        },
      });

      const suggestionByKey = new Map(
        result.suggestions
          .filter((item) => item.key && typeof item.suggestion === 'string')
          .map((item) => [item.key, item.suggestion]),
      );

      const nextContent = JSON.parse(JSON.stringify(baseContent)) as Record<string, unknown>;
      let applied = 0;
      suggestionByKey.forEach((suggestion, key) => {
        if (!key) {
          return;
        }

        setStringByPath(nextContent, key, suggestion);
        applied += 1;
      });

      setEditorSourceContent(nextContent);
      setEditorVisualEntries(extractStringEntries(nextContent));
      setEditorJson(JSON.stringify(nextContent, null, 2));

      notify.success(
        `IA aplicada: ${applied} sugerencia(s)${entries.length > limited.length ? ' (lote parcial)' : ''}`,
      );
    } catch {
      notify.error('No se pudieron obtener sugerencias IA');
    } finally {
      setAiSuggestBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title={project ? project.name : 'Proyecto'}
        subtitle="Gestión de idiomas y carga inicial de traducciones"
      />

      <main className="mx-auto w-full max-w-6xl px-4 pb-24 md:px-6 lg:pb-6">
        <div className="mb-3 lg:pl-72">
          <Button type="button" variant="outline" size="sm" onClick={() => navigate('/projects')}>
            <ArrowLeft size={14} className="sm:mr-1" />
            <span className="hidden sm:inline">Volver a proyectos</span>
          </Button>
        </div>

        {error ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : null}

        <div className="lg:hidden">
          <div className="fixed bottom-3 left-1/2 z-30 w-[calc(100%-1.5rem)] -translate-x-1/2 rounded-2xl border border-zinc-200 bg-white/95 p-1.5 shadow-lg backdrop-blur">
            <nav className="grid grid-cols-5 gap-1">
              {SECTION_ITEMS.map((section) => {
                const isActive = activeSection === section.id;

                return (
                  <button
                    key={section.id}
                    type="button"
                    className={`flex flex-col items-center gap-1 rounded-lg px-2 py-2 text-[11px] font-medium transition-colors ${
                      isActive ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'
                    }`}
                    onClick={() => setActiveSection(section.id)}
                  >
                    {sectionIconById[section.id]}
                    <span>{section.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        <div className="mt-4 lg:pl-72">
          <aside className="fixed left-6 top-24 z-20 hidden w-64 lg:block">
            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
              <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Secciones</p>
              <nav className="space-y-1">
                {SECTION_ITEMS.map((section) => {
                  const isActive = activeSection === section.id;

                  return (
                    <button
                      key={section.id}
                      type="button"
                      className={`flex w-full items-center justify-between rounded-md px-3 py-2.5 text-left text-sm transition-colors ${
                        isActive ? 'bg-zinc-900 text-white' : 'text-zinc-700 hover:bg-zinc-100'
                      }`}
                      onClick={() => setActiveSection(section.id)}
                    >
                      <span className="inline-flex items-center gap-2">
                        {sectionIconById[section.id]}
                        {section.label}
                      </span>
                      <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-white' : 'bg-zinc-300'}`} />
                    </button>
                  );
                })}
              </nav>
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
                onGoToSection={setActiveSection}
              />
            </div>

            <div className={`${activeSection === 'languages' ? 'block' : 'hidden'} mt-2`}>
              <LanguagesSection
                languages={languages}
                referenceLanguageId={project?.referenceLanguageId}
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
                isDraggingFiles={isDraggingFiles}
                ingestFiles={ingestFiles}
                translationFiles={translationFiles}
                loading={loading}
                onDropFiles={onDropFiles}
                onDragOverFiles={onDragOverFiles}
                onDragLeaveFiles={onDragLeaveFiles}
                onPickFiles={onPickFiles}
                onIngest={onIngest}
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
                  setEditorTargetLanguageId('');
                  setEditorCloneMode('EMPTY_STRUCTURE');
                  setEditorVersions([]);
                  setEditorVersionsLoading(false);
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
                currentIssueIndex={activeIssueIndex}
                totalIssues={sortedFilteredIssues.length}
                onGoToPreviousIssue={goToPreviousIssue}
                onGoToNextIssue={goToNextIssue}
                versions={editorVersions}
                versionsLoading={editorVersionsLoading}
                onRestoreVersion={restoreEditorVersion}
                aiSuggestBusy={aiSuggestBusy}
                onRequestAiSuggestions={requestAiSuggestions}
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
                onRunAnalysis={runAnalysis}
                onExportIssuesCsv={exportIssuesCsv}
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
      </main>
    </>
  );
}
