import JSZip from 'jszip';
import {
  AlertTriangle,
  Archive,
  CircleHelp,
  Download,
  FilePenLine,
  FileSearch,
  FileUp,
  Languages,
  Pencil,
  Star,
  Trash2,
} from 'lucide-react';
import type { ChangeEvent, DragEvent, FormEvent, ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
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
} from '../lib/types';

type IngestFileItem = {
  path: string;
  content: unknown;
};

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
  const [editorBusy, setEditorBusy] = useState(false);
  const [downloadBusy, setDownloadBusy] = useState(false);
  const [expandedIssueId, setExpandedIssueId] = useState<string | null>(null);
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
      notify.success(`Archivo abierto en editor: ${file.filename}`);
    } catch {
      notify.error('No se pudo cargar el archivo en el editor');
    } finally {
      setEditorBusy(false);
    }
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

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 pb-24 md:px-6 lg:pb-6">
      <PageHeader
        title={project ? project.name : 'Proyecto'}
        subtitle="Gestión de idiomas y carga inicial de traducciones"
      />

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
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-zinc-900">Resumen del proyecto</p>
                <p className="mt-1 text-sm text-zinc-600">
                  Vista general para comprobar estado de idiomas, archivos y análisis antes de editar o cargar nuevos
                  contenidos.
                </p>
              </div>
              <span className="rounded-full border border-zinc-300 bg-zinc-100 px-2 py-1 text-xs text-zinc-700">
                Patron: {project ? PATTERN_LABELS[project.i18nPattern] : '-'}
              </span>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="border-l-2 border-zinc-300 pl-3">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Idiomas</p>
                <p className="mt-1 text-2xl font-semibold text-zinc-900">{languages.length}</p>
                <p className="text-xs text-zinc-600">Configurados en el proyecto</p>
              </div>

              <div className="border-l-2 border-zinc-300 pl-3">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Archivos</p>
                <p className="mt-1 text-2xl font-semibold text-zinc-900">{translationFiles.length}</p>
                <p className="text-xs text-zinc-600">Total de traducciones cargadas</p>
              </div>

              <div className="border-l-2 border-zinc-300 pl-3">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Issues</p>
                <p className="mt-1 text-2xl font-semibold text-zinc-900">{analysisReport?.issues.length ?? 0}</p>
                <p className="text-xs text-zinc-600">Del ultimo análisis ejecutado</p>
              </div>

              <div className="border-l-2 border-zinc-300 pl-3">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Referencia</p>
                <p className="mt-1 text-base font-semibold text-zinc-900">
                  {project?.referenceLanguageId
                    ? `${languageNameById.get(project.referenceLanguageId)?.name ?? 'Configurado'}`
                    : 'Sin definir'}
                </p>
                <p className="text-xs text-zinc-600">Idioma base para comparaciones</p>
              </div>
            </div>

            <div className="mt-5 border-t border-zinc-200 pt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Distribucion de issues</p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full border border-zinc-300 px-2 py-1 text-zinc-700">
                  Falta clave: {issueTypeStats.MISSING_KEY}
                </span>
                <span className="rounded-full border border-zinc-300 px-2 py-1 text-zinc-700">
                  No usada: {issueTypeStats.UNUSED_KEY}
                </span>
                <span className="rounded-full border border-zinc-300 px-2 py-1 text-zinc-700">
                  Interp.: {issueTypeStats.INTERPOLATION_MISMATCH}
                </span>
              </div>
            </div>

            <div className="mt-5 border-t border-zinc-200 pt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Accesos rápidos</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setActiveSection('languages')}>
                  <Languages size={14} className="mr-1" />
                  Ir a idiomas
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setActiveSection('upload')}>
                  <FileUp size={14} className="mr-1" />
                  Cargar archivos
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setActiveSection('editor')}>
                  <FilePenLine size={14} className="mr-1" />
                  Abrir editor
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => setActiveSection('analysis')}>
                  <FileSearch size={14} className="mr-1" />
                  Ver análisis
                </Button>
              </div>
            </div>
          </div>

          <div className={`${activeSection === 'languages' ? 'block' : 'hidden'} mt-2`}>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
              <Languages size={16} />
              Idiomas
            </h2>

            <form className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_auto]" onSubmit={onAddLanguage}>
              <div>
                <label className="mb-1 block text-sm text-zinc-600">Codigo</label>
                <Input placeholder="en" value={code} onChange={(event) => setCode(event.target.value)} required />
              </div>

              <div>
                <label className="mb-1 block text-sm text-zinc-600">Nombre</label>
                <Input placeholder="Espanol" value={name} onChange={(event) => setName(event.target.value)} required />
              </div>

              <div className="md:self-end">
                <Button type="submit" disabled={loading} className="w-full md:w-auto">
                  {loading ? 'Anadiendo...' : 'Anadir idioma'}
                </Button>
              </div>
            </form>

            {languages.length === 0 ? (
              <p className="mt-3 text-sm text-zinc-500">No hay idiomas configurados.</p>
            ) : (
              <ul className="mt-3 divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
                {languages.map((language) => {
                  const isReference = language.id === project?.referenceLanguageId;

                  return (
                    <li key={language.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-3">
                      <div>
                        <p className="text-sm font-semibold text-zinc-900">{language.name}</p>
                        <p className="text-xs text-zinc-500">{language.code}</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {isReference ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                            <Star size={12} className="fill-emerald-500 text-emerald-500" />
                            Referencia
                          </span>
                        ) : (
                          <Button type="button" variant="outline" size="sm" onClick={() => setReference(language.id)}>
                            <Star size={14} className="mr-1" />
                            Marcar referencia
                          </Button>
                        )}

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => openLanguageEditModal(language)}
                        >
                          <Pencil size={14} className="mr-1" />
                          Editar
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="border-red-300 text-red-800 hover:bg-red-100 hover:text-red-900"
                          onClick={() => setLanguageToDelete(language)}
                        >
                          <Trash2 size={14} className="mr-1" />
                          Eliminar
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className={`${activeSection === 'upload' ? 'block' : 'hidden'} mt-2`}>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
              <FileUp size={16} />
              Carga de traducciones
            </h2>

            <div
              className={`mt-3 rounded-xl border-2 border-dashed p-5 transition-colors ${
                isDraggingFiles ? 'border-zinc-700 bg-zinc-50' : 'border-zinc-300 bg-zinc-50/40'
              }`}
              onDrop={onDropFiles}
              onDragOver={onDragOverFiles}
              onDragLeave={onDragLeaveFiles}
            >
              <p className="text-sm font-medium text-zinc-800">Arrastra archivos JSON aqui</p>
              <p className="mt-1 text-xs text-zinc-600">
                Tambien puedes seleccionar archivos o una carpeta desde Finder.
              </p>
              <Input
                className="mt-3 block bg-white"
                type="file"
                accept=".json,application/json"
                multiple
                onChange={onPickFiles}
                // @ts-expect-error - this attribute is supported by Chromium browsers.
                webkitdirectory=""
              />
            </div>

            {ingestFiles.length > 0 ? (
              <ul className="mt-3 max-h-52 divide-y divide-zinc-200 overflow-auto rounded-lg border border-zinc-200 bg-white">
                {ingestFiles.map((file) => (
                  <li key={file.path} className="px-3 py-2 text-sm text-zinc-700">
                    {file.path}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-zinc-500">Todavia no has seleccionado archivos.</p>
            )}

            <div className="mt-3">
              <Button type="button" onClick={onIngest} disabled={loading || ingestFiles.length === 0}>
                {loading ? 'Cargando...' : 'Cargar archivos'}
              </Button>
            </div>

            <h3 className="mt-6 text-sm font-semibold text-zinc-900">Archivos ya cargados</h3>

            {translationFiles.length === 0 ? (
              <p className="mt-3 text-sm text-zinc-500">No hay archivos cargados en el proyecto.</p>
            ) : (
              <ul className="mt-3 divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
                {translationFiles.map((file) => (
                  <li key={file.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-3">
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">{file.filename}</p>
                      <p className="text-xs text-zinc-500">
                        Grupo: {file.fileGroup.name} · {file.language.name} ({file.language.code})
                      </p>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={() => openEditorForFile(file.id)}>
                      <FilePenLine size={14} className="mr-1" />
                      Editar
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-red-300 text-red-800 hover:bg-red-100 hover:text-red-900"
                      onClick={() => setFileToDelete(file)}
                    >
                      <Trash2 size={14} className="mr-1" />
                      Eliminar
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={`${activeSection === 'editor' ? 'block' : 'hidden'} mt-2`}>
            <h2 className="flex items-center gap-2 text-base font-semibold text-zinc-900">
              <FilePenLine size={16} />
              Editor integrado de traducciones
            </h2>

            <p className="mt-2 text-base text-zinc-600">
              Abre un archivo cargado, edita su JSON y guarda cambios para corregir issues o preparar nuevas
              traducciones.
            </p>

            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <div className="border-l-2 border-zinc-300 pl-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Paso 1</p>
                <p className="mt-1 text-sm font-medium text-zinc-900">Selecciona archivo</p>
                <Select
                  containerClassName="mt-2"
                  value={editorFileId ?? ''}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (!value) {
                      setEditorFileId(null);
                      setEditorFileMeta(null);
                      setEditorSourceContent(null);
                      setEditorVisualEntries([]);
                      setEditorVisualQuery('');
                      setEditorJson('');
                      setEditorTargetLanguageId('');
                      setEditorCloneMode('EMPTY_STRUCTURE');
                      setCloneConfirmOpen(false);
                      return;
                    }
                    void openEditorForFile(value);
                  }}
                >
                  <option value="">Selecciona un archivo para editar</option>
                  {translationFiles.map((file) => (
                    <option key={file.id} value={file.id}>
                      {file.fileGroup.name} · {file.language.code} · {file.filename}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="border-l-2 border-zinc-300 pl-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Paso 2</p>
                <p className="mt-1 text-sm font-medium text-zinc-900">Modo de edición</p>
                <div className="mt-2 inline-flex rounded-md border border-zinc-300 bg-white p-1">
                  <button
                    type="button"
                    className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                      editorMode === 'RAW' ? 'bg-zinc-900 text-white' : 'text-zinc-700 hover:bg-zinc-100'
                    }`}
                    onClick={() => onChangeEditorMode('RAW')}
                  >
                    RAW
                  </button>
                  <button
                    type="button"
                    className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                      editorMode === 'VISUAL' ? 'bg-zinc-900 text-white' : 'text-zinc-700 hover:bg-zinc-100'
                    }`}
                    onClick={() => onChangeEditorMode('VISUAL')}
                  >
                    Visual
                  </button>
                </div>
              </div>

              <div className="border-l-2 border-zinc-300 pl-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Paso 3</p>
                <p className="mt-1 text-sm font-medium text-zinc-900">Guardar cambios</p>
                <Button
                  className="mt-2 w-full"
                  type="button"
                  onClick={saveEditorFile}
                  disabled={!editorFileId || editorBusy}
                >
                  {editorBusy ? 'Guardando...' : 'Guardar archivo'}
                </Button>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-y border-zinc-200 py-3">
              <p className="text-base font-medium text-zinc-800">
                {editorFileMeta
                  ? `Editando ${editorFileMeta.filename} · ${editorFileMeta.language.name} (${editorFileMeta.language.code})`
                  : 'Selecciona un archivo para empezar'}
              </p>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  className="border-sky-700 bg-sky-600 text-white shadow-sm hover:bg-sky-700"
                  size="sm"
                  disabled={!editorFileId || editorBusy}
                  onClick={downloadCurrentEditedFile}
                >
                  <Download size={14} className="mr-1.5" />
                  Exportar JSON
                </Button>
                <Button
                  type="button"
                  className="border-emerald-700 bg-emerald-600 text-white shadow-sm hover:bg-emerald-700"
                  size="sm"
                  disabled={downloadBusy || translationFiles.length === 0}
                  onClick={downloadProjectZip}
                >
                  <Archive size={14} className="mr-1.5" />
                  {downloadBusy ? 'Generando ZIP...' : 'Exportar ZIP'}
                </Button>

                <div className="group relative">
                  <button
                    type="button"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-zinc-300 bg-white text-zinc-600 transition-colors hover:bg-zinc-100"
                    aria-label="Informacion sobre exportaciones"
                  >
                    <CircleHelp size={15} />
                  </button>
                  <div className="pointer-events-none absolute right-0 top-10 z-20 w-72 rounded-lg border border-zinc-200 bg-white p-3 text-sm text-zinc-700 opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                    Exportar JSON descarga solo el archivo que estas editando. Exportar ZIP descarga todos los archivos
                    del proyecto.
                  </div>
                </div>
              </div>
            </div>

            {editorMode === 'RAW' ? (
              <textarea
                className="mt-3 min-h-[320px] w-full rounded-lg border border-zinc-300 bg-white p-3 font-mono text-sm text-zinc-900 outline-none focus:border-zinc-500"
                value={editorJson}
                onChange={(event) => setEditorJson(event.target.value)}
                placeholder="Abre un archivo para empezar a editar su JSON..."
                disabled={!editorFileId}
              />
            ) : (
              <div className="mt-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Input
                    className="max-w-xl"
                    value={editorVisualQuery}
                    onChange={(event) => setEditorVisualQuery(event.target.value)}
                    placeholder="Buscar por clave o texto..."
                    disabled={!editorFileId}
                  />
                  <span className="rounded-full border border-zinc-300 px-3 py-1 text-sm text-zinc-600">
                    {filteredVisualEntries.length} campos
                  </span>
                </div>

                <div className="mt-4 max-h-[560px] overflow-auto pr-1">
                  {!editorFileId ? (
                    <p className="text-base text-zinc-500">Abre un archivo para empezar.</p>
                  ) : filteredVisualEntries.length === 0 ? (
                    <p className="text-base text-zinc-500">
                      No hay resultados con el filtro actual o no hay claves string editables.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {filteredVisualEntries.map((entry) => (
                        <label key={entry.path} className="block border-b border-zinc-200 pb-4">
                          <span className="inline-flex rounded bg-zinc-100 px-2 py-1 font-mono text-sm font-semibold text-zinc-800">
                            {entry.path}
                          </span>
                          <textarea
                            className="mt-2 min-h-[110px] w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base leading-relaxed text-zinc-900 outline-none focus:border-zinc-500"
                            value={entry.value}
                            onChange={(event) => {
                              setEditorVisualEntries((prev) =>
                                prev.map((item) =>
                                  item.path === entry.path ? { ...item, value: event.target.value } : item,
                                ),
                              );
                            }}
                            disabled={!editorFileId}
                          />
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="mt-5 border-t border-zinc-200 pt-4">
              <p className="text-base font-medium text-zinc-900">Crear/actualizar archivo en otro idioma</p>
              <p className="mt-1 text-sm text-zinc-600">
                Elige destino y tipo de copia. Solo se ejecuta cuando pulses el boton final.
              </p>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm text-zinc-600">Idioma destino</label>
                  <Select
                    value={editorTargetLanguageId}
                    onChange={(event) => setEditorTargetLanguageId(event.target.value)}
                    disabled={!editorFileId || editorTargetLanguageOptions.length === 0}
                  >
                    <option value="">Selecciona idioma destino</option>
                    {editorTargetLanguageOptions.map((language) => (
                      <option key={language.id} value={language.id}>
                        {language.name} ({language.code})
                      </option>
                    ))}
                  </Select>
                </div>

                <div>
                  <label className="mb-1 block text-sm text-zinc-600">Tipo de accion</label>
                  <Select
                    value={editorCloneMode}
                    onChange={(event) => setEditorCloneMode(event.target.value as CloneMode)}
                    disabled={!editorFileId}
                  >
                    <option value="EMPTY_STRUCTURE">Crear estructura vacia (seguro)</option>
                    <option value="COPY_CONTENT">Copiar contenido actual (sobrescribe destino)</option>
                  </Select>
                </div>
              </div>

              <p className="mt-2 text-sm text-zinc-600">
                {editorCloneMode === 'EMPTY_STRUCTURE'
                  ? 'Se crea la misma estructura de claves y se vacian los textos del idioma destino.'
                  : 'Se copian las traducciones actuales tal cual al idioma destino y puede sobrescribir su contenido.'}
              </p>

              <Button
                type="button"
                className="mt-3"
                variant={editorCloneMode === 'EMPTY_STRUCTURE' ? 'outline' : 'default'}
                disabled={!editorFileId || editorBusy || !editorTargetLanguageId}
                onClick={() => {
                  if (editorCloneMode === 'COPY_CONTENT') {
                    setCloneConfirmOpen(true);
                    return;
                  }

                  void cloneEditorFileToLanguage(true);
                }}
              >
                {editorCloneMode === 'EMPTY_STRUCTURE'
                  ? `Crear estructura vacia${selectedTargetLanguage ? ` en ${selectedTargetLanguage.code}` : ''}`
                  : `Copiar contenido${selectedTargetLanguage ? ` en ${selectedTargetLanguage.code}` : ''}`}
              </Button>
            </div>

            <div className="mt-5 border-t border-zinc-200" />
          </div>

          <div className={`${activeSection === 'analysis' ? 'block' : 'hidden'} mt-2`}>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
              <FileSearch size={16} />
              Análisis de archivos
            </h2>

            <p className="mt-2 text-sm text-zinc-600">
              Ejecuta una comparacion contra el idioma de referencia para detectar claves faltantes, no usadas e
              interpolaciones inconsistentes.
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" onClick={runAnalysis} disabled={loading}>
                {loading ? 'Analizando...' : 'Ejecutar análisis'}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={exportIssuesCsv}
                disabled={!analysisReport || sortedFilteredIssues.length === 0}
              >
                Exportar CSV (filtrado)
              </Button>
            </div>

            {analysisReport ? (
              <div className="mt-4">
                <h3 className="text-sm font-semibold text-zinc-900">Resultado del ultimo reporte</h3>

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm text-zinc-600">Tipo de issue</label>
                    <Select
                      value={issueTypeFilter}
                      onChange={(event) => setIssueTypeFilter(event.target.value as 'ALL' | IssueType)}
                    >
                      <option value="ALL">Todos</option>
                      <option value="MISSING_KEY">Falta clave</option>
                      <option value="UNUSED_KEY">Clave no usada</option>
                      <option value="INTERPOLATION_MISMATCH">Interpolacion distinta</option>
                    </Select>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm text-zinc-600">Idioma</label>
                    <Select
                      value={issueLanguageFilter}
                      onChange={(event) => setIssueLanguageFilter(event.target.value)}
                    >
                      <option value="ALL">Todos</option>
                      {languages.map((language) => (
                        <option key={language.id} value={language.id}>
                          {language.name} ({language.code})
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>

                <div className="mt-4 border-t border-zinc-200 pt-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-700">
                      Falta clave: {issueTypeStats.MISSING_KEY}
                    </span>
                    <span className="rounded-full border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-700">
                      No usada: {issueTypeStats.UNUSED_KEY}
                    </span>
                    <span className="rounded-full border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-700">
                      Interpolacion: {issueTypeStats.INTERPOLATION_MISMATCH}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIssueTypeFilter('ALL');
                        setIssueLanguageFilter('ALL');
                      }}
                    >
                      Limpiar filtros
                    </Button>
                  </div>
                </div>

                {analysisReport.issues.length > 0 ? (
                  <p className="mt-3 text-sm text-zinc-600">
                    Mostrando {sortedFilteredIssues.length} de {analysisReport.issues.length} issue(s)
                  </p>
                ) : null}

                {sortedFilteredIssues.length === 0 ? (
                  <p className="mt-3 text-sm text-zinc-500">No se encontraron issues.</p>
                ) : (
                  <ul className="mt-3 divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
                    {sortedFilteredIssues.map((issue) => {
                      const language = languageNameById.get(issue.languageId);
                      const isExpanded = expandedIssueId === issue.id;
                      return (
                        <li key={issue.id} className="flex flex-wrap items-start justify-between gap-3 px-3 py-3">
                          <div>
                            <p className="text-sm font-semibold text-zinc-900">{issue.key}</p>
                            <p className="text-xs text-zinc-500">
                              {issueTypeLabel(issue.type)} ·{' '}
                              {language ? `${language.name} (${language.code})` : issue.languageId}
                            </p>
                            {isExpanded ? (
                              <p className="mt-2 text-xs leading-relaxed text-zinc-700">
                                {formatIssueDetails(issue.details)}
                              </p>
                            ) : null}
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-zinc-300 bg-zinc-100 px-2 py-1 text-xs text-zinc-700">
                              {issue.type}
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setExpandedIssueId(isExpanded ? null : issue.id)}
                            >
                              {isExpanded ? 'Ocultar' : 'Ver detalle'}
                            </Button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            ) : (
              <p className="mt-3 text-sm text-zinc-500">Aún no hay un reporte cargado.</p>
            )}

            {!project?.referenceLanguageId ? (
              <p className="mt-3 flex items-center gap-2 text-sm text-red-700">
                <AlertTriangle size={14} />
                Debes marcar un idioma de referencia antes de ejecutar el análisis.
              </p>
            ) : null}
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
  );
}
