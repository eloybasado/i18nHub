import {
  Archive,
  Bot,
  Braces,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Download,
  EyeOff,
  FilePenLine,
  FileSearch,
  Files,
  Languages,
  ListFilter,
  Maximize2,
  Minimize2,
  Network,
  Plus,
  Search,
  SearchCheck,
  Trash2,
  TriangleAlert,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { AnalysisIssue, Language, TranslationFileSummary, TranslationFileVersionSummary } from '../../lib/types';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { SelectModal, type SelectModalOption } from '../ui/select-modal';
import { AiSuggestionReviewList } from './AiSuggestionReviewList';
import { CloneToLanguageWizardModal } from './CloneToLanguageWizardModal';
import { EditorFilePickerModal } from './EditorFilePickerModal';
import { EditorIssueList } from './EditorIssueList';
import { JsonTreeEditor } from './JsonTreeEditor';
import { VersionHistoryModal } from './VersionHistoryModal';

type EditorVisualEntry = {
  path: string;
  value: string;
};

type AiSuggestionCandidate = {
  id: string;
  key: string;
  currentText: string;
  suggestion: string;
  reason?: string;
  issueType: 'MISSING_KEY' | 'UNUSED_KEY' | 'INTERPOLATION_MISMATCH' | 'INCORRECT_NESTING';
  fileGroupId?: string;
  fileGroupName: string;
  targetTranslationFileId?: string;
  targetFilename?: string;
  applicableToCurrentFile: boolean;
  selected: boolean;
};

type AiSuggestionScope = 'CURRENT_FILE_ISSUES' | 'ALL_FILES_ISSUES' | 'ALL_FILES_BY_TYPE';

type AiSuggestionIssueType = 'MISSING_KEY' | 'UNUSED_KEY' | 'INTERPOLATION_MISMATCH' | 'INCORRECT_NESTING';

type CloneMode = 'EMPTY_STRUCTURE' | 'COPY_CONTENT' | 'AI_TRANSLATE_FULL';

const AI_SUGGESTION_SCOPE_OPTIONS: SelectModalOption<AiSuggestionScope>[] = [
  {
    value: 'CURRENT_FILE_ISSUES',
    label: 'Issues del archivo actual',
    description: 'Genera sugerencias solo para el archivo que estas editando ahora.',
    icon: FileSearch,
  },
  {
    value: 'ALL_FILES_ISSUES',
    label: 'Issues de todos los archivos',
    description: 'Recorre el proyecto completo y prepara sugerencias de cada archivo con issues.',
    icon: Files,
  },
  {
    value: 'ALL_FILES_BY_TYPE',
    label: 'Por tipo de issue en todo el proyecto',
    description: 'Filtra por un tipo concreto de issue y genera sugerencias mas dirigidas.',
    icon: ListFilter,
  },
];

const AI_SUGGESTION_ISSUE_TYPE_OPTIONS: SelectModalOption<AiSuggestionIssueType>[] = [
  {
    value: 'MISSING_KEY',
    label: 'Missing keys',
    description: 'Busca claves que faltan y propone traducciones nuevas.',
    icon: SearchCheck,
  },
  {
    value: 'UNUSED_KEY',
    label: 'Unused keys',
    description: 'Detecta claves sobrantes respecto al idioma de referencia.',
    icon: TriangleAlert,
  },
  {
    value: 'INTERPOLATION_MISMATCH',
    label: 'Interpolation mismatch',
    description: 'Revisa diferencias en variables como {name} o {count}.',
    icon: Braces,
  },
  {
    value: 'INCORRECT_NESTING',
    label: 'Incorrect nesting',
    description: 'Detecta claves ubicadas en una ruta distinta a la esperada.',
    icon: Network,
  },
];

const VISUAL_ISSUE_ROW_CLASS: Record<string, string> = {
  MISSING_KEY: 'border-red-200 bg-red-50/40',
  UNUSED_KEY: 'border-yellow-200 bg-yellow-50/40',
  INTERPOLATION_MISMATCH: 'border-orange-200 bg-orange-50/40',
  INCORRECT_NESTING: 'border-amber-200 bg-amber-50/40',
};

const VISUAL_ISSUE_BADGE_CLASS: Record<string, string> = {
  MISSING_KEY: 'bg-red-100 text-red-700',
  UNUSED_KEY: 'bg-yellow-100 text-yellow-700',
  INTERPOLATION_MISMATCH: 'bg-orange-100 text-orange-700',
  INCORRECT_NESTING: 'bg-amber-100 text-amber-700',
};

const VISUAL_ISSUE_LABEL: Record<string, string> = {
  MISSING_KEY: 'Falta',
  UNUSED_KEY: 'Extra',
  INTERPOLATION_MISMATCH: 'Interpolación',
  INCORRECT_NESTING: 'Anidado',
};

type EditorSectionProps = {
  translationFiles: TranslationFileSummary[];
  editorFileId: string | null;
  editorFileMeta: TranslationFileSummary | null;
  editorMode: 'RAW' | 'VISUAL' | 'TREE';
  editorBusy: boolean;
  editorJson: string;
  editorVisualEntries: EditorVisualEntry[];
  editorVisualQuery: string;
  highlightedVisualPath?: string | null;
  highlightedRawLine?: number | null;
  onDismissHighlightedVisualPath: () => void;
  onDismissHighlightedRawLine: () => void;
  filteredVisualEntries: EditorVisualEntry[];
  editorTargetLanguageId: string;
  editorTargetLanguageOptions: Language[];
  editorCloneMode: CloneMode;
  selectedTargetLanguage: Language | undefined;
  downloadBusy: boolean;
  onSelectEditorFile: (fileId: string) => void | Promise<void>;
  onResetEditorSelection: () => void;
  onChangeEditorMode: (mode: 'RAW' | 'VISUAL' | 'TREE') => void;
  onSaveEditorFile: () => void | Promise<boolean>;
  onEditorJsonChange: (value: string) => void;
  onEditorVisualQueryChange: (value: string) => void;
  onEditorVisualEntryChange: (path: string, value: string) => void;
  onDownloadCurrentEditedFile: () => void;
  onDownloadProjectZip: () => void | Promise<void>;
  onTargetLanguageChange: (languageId: string) => void;
  onCloneModeChange: (mode: CloneMode) => void;
  onCloneEmptyStructure: () => void;
  onRequestCopyContent: () => void;
  onTranslateFullWithAi: () => void | Promise<void>;
  sortedIssues: AnalysisIssue[];
  activeIssueId: string | null;
  resolvedIssueIds: Set<string>;
  languageNameById: Map<string, { name: string; code: string }>;
  onGoToIssue: (issue: AnalysisIssue) => void;
  treeReferenceEntries: EditorVisualEntry[] | null;
  showReferenceOverlay: boolean;
  onShowReferenceOverlayChange: (show: boolean) => void;
  currentFileIssues: AnalysisIssue[];
  versions: TranslationFileVersionSummary[];
  versionsLoading: boolean;
  onRestoreVersion: (versionId: string) => void | Promise<void>;
  aiSuggestBusy: boolean;
  onRequestAiSuggestions: () => void | Promise<void>;
  aiSuggestions: AiSuggestionCandidate[];
  aiSuggestionScope: AiSuggestionScope;
  onAiSuggestionScopeChange: (scope: AiSuggestionScope) => void;
  aiSuggestionIssueTypeFilter: AiSuggestionIssueType;
  onAiSuggestionIssueTypeFilterChange: (type: AiSuggestionIssueType) => void;
  onToggleAiSuggestion: (id: string) => void;
  onSelectAllAiSuggestions: () => void;
  onClearAiSuggestions: () => void;
  onApplySelectedAiSuggestions: () => void | Promise<void>;
  isPro: boolean;
  onVersionHistoryProGate: () => void;
  onViewVersion?: (versionId: string) => Promise<Record<string, unknown> | null>;
  onAddEntry: (path: string, value: string) => void;
  onDeleteEntry: (path: string) => void;
  onFixIncorrectNesting: (issue: AnalysisIssue) => void;
  editorHasChanges: boolean;
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function ReferenceToggle({ active, onChange }: { active: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!active)}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all ${
        active
          ? 'bg-violet-100 text-violet-700 ring-1 ring-violet-300'
          : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-700'
      }`}
    >
      <Languages size={12} />
      {active ? 'Referencia activa' : 'Ver referencia'}
    </button>
  );
}

// Simple stateless badge button — panel state lives in EditorSection
type IssuesBadgeButtonProps = {
  pending: number;
  panelOpen: boolean;
  onToggle: (anchorRect: DOMRect) => void;
};

function IssuesBadgeButton({ pending, panelOpen, onToggle }: IssuesBadgeButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);
  return (
    <button
      ref={ref}
      type="button"
      onClick={() => ref.current && onToggle(ref.current.getBoundingClientRect())}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
        panelOpen
          ? 'bg-zinc-900 text-white'
          : pending > 0
            ? 'bg-red-50 text-red-700 ring-1 ring-red-200 hover:bg-red-100'
            : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100'
      }`}
    >
      <TriangleAlert size={12} />
      {pending > 0 ? `${pending} issues` : 'Sin issues'}
    </button>
  );
}

export function EditorSection({
  translationFiles,
  editorFileId,
  editorFileMeta,
  editorMode,
  editorBusy,
  editorJson,
  editorVisualEntries,
  editorVisualQuery,
  highlightedVisualPath,
  highlightedRawLine,
  onDismissHighlightedVisualPath,
  onDismissHighlightedRawLine,
  filteredVisualEntries,
  editorTargetLanguageId,
  editorTargetLanguageOptions,
  editorCloneMode,
  selectedTargetLanguage,
  downloadBusy,
  onSelectEditorFile,
  onResetEditorSelection,
  onChangeEditorMode,
  onSaveEditorFile,
  onEditorJsonChange,
  onEditorVisualQueryChange,
  onEditorVisualEntryChange,
  onDownloadCurrentEditedFile,
  onDownloadProjectZip,
  onTargetLanguageChange,
  onCloneModeChange,
  onCloneEmptyStructure,
  onRequestCopyContent,
  onTranslateFullWithAi,
  sortedIssues,
  activeIssueId,
  resolvedIssueIds,
  languageNameById,
  onGoToIssue,
  treeReferenceEntries,
  showReferenceOverlay,
  onShowReferenceOverlayChange,
  currentFileIssues,
  versions,
  versionsLoading,
  onRestoreVersion,
  aiSuggestBusy,
  onRequestAiSuggestions,
  aiSuggestions,
  aiSuggestionScope,
  onAiSuggestionScopeChange,
  aiSuggestionIssueTypeFilter,
  onAiSuggestionIssueTypeFilterChange,
  onToggleAiSuggestion,
  onSelectAllAiSuggestions,
  onClearAiSuggestions,
  onApplySelectedAiSuggestions,
  isPro,
  onVersionHistoryProGate,
  onViewVersion,
  onAddEntry,
  onDeleteEntry,
  onFixIncorrectNesting,
  editorHasChanges,
}: EditorSectionProps) {
  const rawEditorRef = useRef<HTMLTextAreaElement | null>(null);
  const [rawExpanded, setRawExpanded] = useState(false);
  const [visualSearchInput, setVisualSearchInput] = useState(editorVisualQuery);
  const [treeSearchQuery, setTreeSearchQuery] = useState('');
  const [treeSearchOpen, setTreeSearchOpen] = useState(false);
  const [treeFocusPath, setTreeFocusPath] = useState<string | null>(null);
  const treeSearchRef = useRef<HTMLDivElement>(null);
  const [rawSearchQuery, setRawSearchQuery] = useState('');
  const [rawSearchIndex, setRawSearchIndex] = useState(0);

  // ── Issues panel — state lives here so it survives mode/file changes ──────
  const PANEL_MIN_W = 260;
  const PANEL_MIN_H = 180;
  const PANEL_DEFAULT_W = 320;
  const PANEL_DEFAULT_H = 360;
  const [issuesPanelOpen, setIssuesPanelOpen] = useState(false);
  const [issuesPanelPos, setIssuesPanelPos] = useState<{ x: number; y: number } | null>(null);
  const [issuesPanelSize, setIssuesPanelSize] = useState({ w: PANEL_DEFAULT_W, h: PANEL_DEFAULT_H });
  const [issuesHideResolved, setIssuesHideResolved] = useState(false);
  const issuesPanelRef = useRef<HTMLDivElement>(null);
  const issuesDragState = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const issuesResizeState = useRef<{ startX: number; startY: number; origW: number; origH: number } | null>(null);

  const clampPanelPos = (x: number, y: number, w = issuesPanelSize.w, h = issuesPanelSize.h) => ({
    x: Math.max(0, Math.min(x, window.innerWidth - w)),
    y: Math.max(0, Math.min(y, window.innerHeight - h)),
  });

  const handleIssuesBadgeToggle = (anchorRect: DOMRect) => {
    if (issuesPanelOpen) { setIssuesPanelOpen(false); return; }
    if (!issuesPanelPos) {
      setIssuesPanelPos(clampPanelPos(anchorRect.left, anchorRect.bottom + 8));
    }
    setIssuesPanelOpen(true);
  };

  useEffect(() => {
    if (!issuesPanelOpen) return;
    const onResize = () => setIssuesPanelPos((prev) => prev ? clampPanelPos(prev.x, prev.y) : prev);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [issuesPanelOpen, issuesPanelSize]);

  const handleIssuesDragStart = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!issuesPanelPos) return;
    e.preventDefault();
    issuesDragState.current = { startX: e.clientX, startY: e.clientY, origX: issuesPanelPos.x, origY: issuesPanelPos.y };
    const onMove = (ev: MouseEvent) => {
      if (!issuesDragState.current) return;
      setIssuesPanelPos(clampPanelPos(
        issuesDragState.current.origX + ev.clientX - issuesDragState.current.startX,
        issuesDragState.current.origY + ev.clientY - issuesDragState.current.startY,
      ));
    };
    const onUp = () => {
      issuesDragState.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const handleIssuesResizeStart = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    issuesResizeState.current = { startX: e.clientX, startY: e.clientY, origW: issuesPanelSize.w, origH: issuesPanelSize.h };
    const onMove = (ev: MouseEvent) => {
      if (!issuesResizeState.current) return;
      const newW = Math.max(PANEL_MIN_W, issuesResizeState.current.origW + ev.clientX - issuesResizeState.current.startX);
      const newH = Math.max(PANEL_MIN_H, issuesResizeState.current.origH + ev.clientY - issuesResizeState.current.startY);
      setIssuesPanelSize({ w: newW, h: newH });
      setIssuesPanelPos((prev) => prev ? clampPanelPos(prev.x, prev.y, newW, newH) : prev);
    };
    const onUp = () => {
      issuesResizeState.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };
  // ─────────────────────────────────────────────────────────────────────────

  const [showAddForm, setShowAddForm] = useState(false);
  const [addPath, setAddPath] = useState('');
  const [addValue, setAddValue] = useState('');
  const [deletingPath, setDeletingPath] = useState<string | null>(null);
  const [pendingEditorFileId, setPendingEditorFileId] = useState<string | null>(null);
  const [changeFileModalOpen, setChangeFileModalOpen] = useState(false);
  const visualHighlightFocusedPathRef = useRef<string | null>(null);
  const rawHighlightInteractedRef = useRef(false);

  const rawSearchMatches = (() => {
    if (!rawSearchQuery.trim()) return [];
    const matches: number[] = [];
    const q = rawSearchQuery.toLowerCase();
    const src = editorJson.toLowerCase();
    let i = src.indexOf(q);
    while (i !== -1) { matches.push(i); i = src.indexOf(q, i + 1); }
    return matches;
  })();

  const jumpToRawMatch = (idx: number) => {
    if (!rawEditorRef.current || rawSearchMatches.length === 0) return;
    const matchIdx = ((idx % rawSearchMatches.length) + rawSearchMatches.length) % rawSearchMatches.length;
    setRawSearchIndex(matchIdx);
    const start = rawSearchMatches[matchIdx];
    rawEditorRef.current.focus();
    rawEditorRef.current.setSelectionRange(start, start + rawSearchQuery.length);
    rawEditorRef.current.blur();
    rawEditorRef.current.focus();
  };

  const requestEditorFileChange = (fileId: string) => {
    if (fileId === editorFileId) {
      return;
    }

    if (editorHasChanges) {
      setPendingEditorFileId(fileId);
      setChangeFileModalOpen(true);
      return;
    }

    void onSelectEditorFile(fileId);
  };

  const cancelFileChange = () => {
    setChangeFileModalOpen(false);
    setPendingEditorFileId(null);
  };

  const changeWithoutSaving = () => {
    if (!pendingEditorFileId) {
      cancelFileChange();
      return;
    }

    const nextFileId = pendingEditorFileId;
    cancelFileChange();
    void onSelectEditorFile(nextFileId);
  };

  const saveAndChange = async () => {
    if (!pendingEditorFileId) {
      cancelFileChange();
      return;
    }

    const nextFileId = pendingEditorFileId;
    const saved = await onSaveEditorFile();
    if (!saved) {
      return;
    }

    cancelFileChange();
    await onSelectEditorFile(nextFileId);
  };

  useEffect(() => {
    if (!highlightedVisualPath) {
      return;
    }

    const element = document.getElementById(`visual-entry-${highlightedVisualPath}`);
    if (element) {
      element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'auto' });
    }
  }, [highlightedVisualPath, filteredVisualEntries.length]);

  useEffect(() => {
    if (!highlightedRawLine || !rawEditorRef.current) {
      return;
    }

    const textarea = rawEditorRef.current;
    const lines = editorJson.split('\n');
    const lineIndex = Math.max(0, Math.min(highlightedRawLine - 1, lines.length - 1));
    const charStart = lines.slice(0, lineIndex).reduce((sum, line) => sum + line.length + 1, 0);
    textarea.focus();
    textarea.setSelectionRange(charStart, charStart);
  }, [highlightedRawLine, editorJson]);

  useEffect(() => {
    setVisualSearchInput(editorVisualQuery);
  }, [editorVisualQuery]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (visualSearchInput !== editorVisualQuery) {
        onEditorVisualQueryChange(visualSearchInput);
      }
    }, 220);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [visualSearchInput, editorVisualQuery, onEditorVisualQueryChange]);

  return (
    <div className="mt-2">
      <h2 className="flex items-center gap-2 text-base font-semibold text-zinc-900">
        <FilePenLine size={16} />
        Editor integrado de traducciones
      </h2>

      <p className="mt-2 text-base text-zinc-600">
        Abre un archivo cargado, edita su JSON y guarda cambios para corregir issues o preparar nuevas traducciones.
      </p>

      <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Archivo</p>
            <p className="mt-1 text-sm text-zinc-600">Abre el archivo con el que vas a trabajar.</p>
            <div className="mt-3 max-w-2xl">
              <EditorFilePickerModal
                translationFiles={translationFiles}
                selectedFileId={editorFileId}
                onSelectFile={requestEditorFileChange}
                onClearSelection={onResetEditorSelection}
                disabled={editorBusy}
                hasUnsavedChanges={editorHasChanges}
              />
            </div>
          </div>

          <div className="min-w-0 lg:w-[22rem]">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Modo de edición</p>
            <p className="mt-1 text-sm text-zinc-600">Cambia la vista sin volver arriba.</p>
            <div className="mt-3 grid grid-cols-3 gap-1.5 rounded-2xl border border-zinc-200 bg-zinc-50 p-1.5">
              <button
                type="button"
                className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                  editorMode === 'RAW' ? 'bg-zinc-900 text-white' : 'text-zinc-700 hover:bg-zinc-100'
                }`}
                onClick={() => onChangeEditorMode('RAW')}
              >
                RAW
              </button>
              <button
                type="button"
                className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                  editorMode === 'VISUAL' ? 'bg-zinc-900 text-white' : 'text-zinc-700 hover:bg-zinc-100'
                }`}
                onClick={() => onChangeEditorMode('VISUAL')}
              >
                Visual
              </button>
              <button
                type="button"
                className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                  editorMode === 'TREE' ? 'bg-zinc-900 text-white' : 'text-zinc-700 hover:bg-zinc-100'
                }`}
                onClick={() => onChangeEditorMode('TREE')}
              >
                <Network size={11} />
                Árbol
              </button>
            </div>
          </div>
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
            className="border-amber-300 bg-amber-100 text-amber-900 shadow-sm hover:bg-amber-200"
            size="sm"
            disabled={!editorFileId || editorBusy}
            onClick={onDownloadCurrentEditedFile}
          >
            <Download size={14} className="mr-1.5" />
            Exportar JSON
          </Button>
          <Button
            type="button"
            className="border-rose-300 bg-rose-100 text-rose-900 shadow-sm hover:bg-rose-200"
            size="sm"
            disabled={downloadBusy || translationFiles.length === 0}
            onClick={() => void onDownloadProjectZip()}
          >
            <Archive size={14} className="mr-1.5" />
            {downloadBusy ? 'Generando ZIP...' : 'Exportar ZIP'}
          </Button>

          <VersionHistoryModal
            versions={versions}
            versionsLoading={versionsLoading}
            onRestoreVersion={onRestoreVersion}
            disabled={!editorFileId || editorBusy}
            isPro={isPro}
            onProGate={onVersionHistoryProGate}
            onViewVersion={onViewVersion}
          />

          <CloneToLanguageWizardModal
            disabled={!editorFileId}
            editorBusy={editorBusy}
            editorTargetLanguageId={editorTargetLanguageId}
            editorTargetLanguageOptions={editorTargetLanguageOptions}
            editorCloneMode={editorCloneMode}
            selectedTargetLanguage={selectedTargetLanguage}
            onTargetLanguageChange={onTargetLanguageChange}
            onCloneModeChange={onCloneModeChange}
            onCloneEmptyStructure={onCloneEmptyStructure}
            onRequestCopyContent={onRequestCopyContent}
            onTranslateFullWithAi={onTranslateFullWithAi}
          />

          <div className="group relative">
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-zinc-300 bg-white text-zinc-600 transition-colors hover:bg-zinc-100"
              aria-label="Información sobre exportaciones"
            >
              <CircleHelp size={15} />
            </button>
            <div className="pointer-events-none absolute right-0 top-10 z-20 w-72 rounded-lg border border-zinc-200 bg-white p-3 text-sm text-zinc-700 opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
              Exportar JSON descarga solo el archivo que estás editando. Exportar ZIP descarga todos los archivos del proyecto.
            </div>
          </div>
        </div>
      </div>


      <div className="mt-3 flex flex-wrap items-end gap-2">
        <div className="min-w-[220px] flex-1">
          <p className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-zinc-500">
            Asistente IA
            {!isPro && (
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                PRO
              </span>
            )}
          </p>
          <SelectModal
            value={aiSuggestionScope}
            options={AI_SUGGESTION_SCOPE_OPTIONS}
            onChange={onAiSuggestionScopeChange}
            title="Asistente IA"
            description="Elige el alcance de las sugerencias antes de ejecutar la IA."
            placeholder="Selecciona un alcance"
            gridClassName="grid-cols-1"
            disabled={!editorFileId || editorBusy || aiSuggestBusy}
          />
        </div>

        {aiSuggestionScope === 'ALL_FILES_BY_TYPE' ? (
          <div className="min-w-[220px] flex-1">
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-500">Filtro tipo</p>
            <SelectModal
              value={aiSuggestionIssueTypeFilter}
              options={AI_SUGGESTION_ISSUE_TYPE_OPTIONS}
              onChange={onAiSuggestionIssueTypeFilterChange}
              title="Tipo de issue para IA"
              description="Filtra el tipo de issue sobre el que quieres generar sugerencias."
              placeholder="Selecciona un tipo"
              gridClassName="grid-cols-1"
              disabled={!editorFileId || editorBusy || aiSuggestBusy}
            />
          </div>
        ) : null}

        <Button
          type="button"
          className="metallic-shine-btn h-10 self-end"
          disabled={!editorFileId || editorBusy || aiSuggestBusy}
          onClick={() => void onRequestAiSuggestions()}
        >
          <Bot size={14} className="mr-1.5" />
          {aiSuggestBusy ? 'Sugiriendo...' : 'Sugerir IA'}
          {!isPro && (
            <span className="ml-1.5 rounded bg-amber-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
              PRO
            </span>
          )}
        </Button>
      </div>

      <AiSuggestionReviewList
        aiSuggestions={aiSuggestions}
        onToggleAiSuggestion={onToggleAiSuggestion}
        onSelectAllAiSuggestions={onSelectAllAiSuggestions}
        onClearAiSuggestions={onClearAiSuggestions}
        onApplySelectedAiSuggestions={onApplySelectedAiSuggestions}
      />

      {editorFileId ? (
        <div className="fixed bottom-4 right-4 z-40 sm:bottom-6 sm:right-6">
          <Button
            type="button"
            onClick={() => void onSaveEditorFile()}
            disabled={!editorFileId || editorBusy || !editorHasChanges}
            className={`${editorHasChanges ? 'save-dirty-btn' : ''} metallic-shine-btn border-zinc-950 shadow-xl`}
          >
            {editorBusy ? 'Guardando...' : 'Guardar archivo'}
          </Button>
        </div>
      ) : null}

      <Dialog
        open={changeFileModalOpen}
        onOpenChange={(open) => (!open ? cancelFileChange() : setChangeFileModalOpen(true))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tienes cambios sin guardar</DialogTitle>
            <DialogDescription>
              Si cambias de archivo ahora, puedes guardar primero o seguir sin guardar y perder los cambios actuales.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={cancelFileChange}>
              Cancelar
            </Button>
            <Button type="button" variant="outline" onClick={() => void saveAndChange()} disabled={editorBusy}>
              Guardar y cambiar
            </Button>
            <Button type="button" onClick={changeWithoutSaving}>
              Cambiar sin guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {editorMode === 'TREE' ? (
        <div className="mt-3">
          <div className="mb-2 flex items-center gap-2">
            {/* Autocomplete para árbol */}
            <div className="relative min-w-0 flex-1" ref={treeSearchRef}>
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 z-10" />
              <Input
                className="pl-9"
                value={treeSearchQuery}
                onChange={(e) => { setTreeSearchQuery(e.target.value); setTreeSearchOpen(true); }}
                onFocus={() => setTreeSearchOpen(true)}
                onBlur={() => setTimeout(() => setTreeSearchOpen(false), 150)}
                onKeyDown={(e) => { if (e.key === 'Escape') { setTreeSearchOpen(false); setTreeSearchQuery(''); } }}
                placeholder="Ir a clave..."
                disabled={!editorFileId}
              />
              {treeSearchOpen && treeSearchQuery.trim() && (() => {
                const q = treeSearchQuery.toLowerCase();
                const matches = editorVisualEntries.filter(
                  (e) => e.path.toLowerCase().includes(q) || e.value.toLowerCase().includes(q)
                ).slice(0, 12);
                if (matches.length === 0) return null;
                return (
                  <ul className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-lg border border-zinc-200 bg-white shadow-lg">
                    {matches.map((entry) => (
                      <li key={entry.path}>
                        <button
                          type="button"
                          className="flex w-full flex-col gap-0.5 px-3 py-2 text-left hover:bg-zinc-50"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setTreeFocusPath(entry.path);
                            setTreeSearchQuery(entry.path);
                            setTreeSearchOpen(false);
                          }}
                        >
                          <span className="font-mono text-xs font-semibold text-zinc-800">{entry.path}</span>
                          {entry.value && (
                            <span className="truncate text-xs text-zinc-400">{entry.value}</span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                );
              })()}
            </div>
            {treeReferenceEntries && treeReferenceEntries.length > 0 && (
              <ReferenceToggle active={showReferenceOverlay} onChange={onShowReferenceOverlayChange} />
            )}
            {sortedIssues.length > 0 && (
              <IssuesBadgeButton
                pending={sortedIssues.length - sortedIssues.filter((i) => resolvedIssueIds.has(i.id)).length}
                panelOpen={issuesPanelOpen}
                onToggle={handleIssuesBadgeToggle}
              />
            )}
          </div>
          <JsonTreeEditor
            entries={editorVisualEntries}
            referenceEntries={treeReferenceEntries}
            showReference={showReferenceOverlay}
            issues={currentFileIssues}
            resolvedIssueIds={resolvedIssueIds}
            focusPath={treeFocusPath}
            onUpdateEntry={onEditorVisualEntryChange}
            onAddEntry={onAddEntry}
            onDeleteEntry={onDeleteEntry}
            onFixIncorrectNesting={onFixIncorrectNesting}
          />
        </div>
      ) : editorMode === 'RAW' ? (
        rawExpanded ? (
          <div className="fixed inset-0 z-50 bg-white">
            <div className="flex h-full w-full flex-col bg-white px-4 py-4 sm:px-6 sm:py-5">
              <textarea
                ref={rawEditorRef}
                className={`min-h-0 w-full flex-1 rounded-lg border bg-white p-3 font-mono text-sm text-zinc-900 outline-none focus:border-zinc-500 ${
                  highlightedRawLine ? 'border-amber-300 ring-2 ring-amber-100' : 'border-zinc-300'
                }`}
                value={editorJson}
                onChange={(event) => onEditorJsonChange(event.target.value)}
                onFocus={() => {
                  if (highlightedRawLine) {
                    rawHighlightInteractedRef.current = true;
                  }
                }}
                onBlur={() => {
                  if (rawHighlightInteractedRef.current) {
                    rawHighlightInteractedRef.current = false;
                    onDismissHighlightedRawLine();
                  }
                }}
                placeholder="Abre un archivo para empezar a editar su JSON..."
                disabled={!editorFileId}
              />

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-200 pt-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    className="border-amber-300 bg-amber-100 text-amber-900 shadow-sm hover:bg-amber-200"
                    size="sm"
                    disabled={!editorFileId || editorBusy}
                    onClick={onDownloadCurrentEditedFile}
                  >
                    <Download size={14} className="mr-1.5" />
                    Exportar JSON
                  </Button>

                  <VersionHistoryModal
                    versions={versions}
                    versionsLoading={versionsLoading}
                    onRestoreVersion={onRestoreVersion}
                    disabled={!editorFileId || editorBusy}
                  />
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setRawExpanded(false)}
                  disabled={!editorFileId}
                >
                  <Minimize2 size={14} className="mr-1" />
                  Salir de ampliado
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-3">
            <div className="mb-2 flex items-center gap-2">
              <div className="relative min-w-0 flex-1">
                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <Input
                  className="pl-9 pr-24"
                  value={rawSearchQuery}
                  onChange={(e) => { setRawSearchQuery(e.target.value); setRawSearchIndex(0); }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); jumpToRawMatch(e.shiftKey ? rawSearchIndex - 1 : rawSearchIndex + 1); }
                  }}
                  placeholder="Buscar en el JSON..."
                  disabled={!editorFileId}
                />
                {rawSearchMatches.length > 0 && (
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400">
                    {rawSearchIndex + 1}/{rawSearchMatches.length}
                  </span>
                )}
                {rawSearchQuery && rawSearchMatches.length === 0 && (
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-red-400">
                    Sin resultados
                  </span>
                )}
              </div>
              {rawSearchMatches.length > 0 && (
                <>
                  <button
                    type="button"
                    onClick={() => jumpToRawMatch(rawSearchIndex - 1)}
                    className="rounded p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700"
                    title="Anterior (Shift+Enter)"
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => jumpToRawMatch(rawSearchIndex + 1)}
                    className="rounded p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700"
                    title="Siguiente (Enter)"
                  >
                    <ChevronRight size={15} />
                  </button>
                </>
              )}
              {sortedIssues.length > 0 && (
                <IssuesBadgeButton
                  pending={sortedIssues.length - sortedIssues.filter((i) => resolvedIssueIds.has(i.id)).length}
                  panelOpen={issuesPanelOpen}
                  onToggle={handleIssuesBadgeToggle}
                />
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRawExpanded(true)}
                disabled={!editorFileId}
                className="shrink-0"
              >
                <Maximize2 size={14} className="mr-1" />
                Ampliado
              </Button>
            </div>

            <textarea
              ref={rawEditorRef}
              className={`w-full rounded-lg border bg-white p-3 font-mono text-sm text-zinc-900 outline-none focus:border-zinc-500 min-h-[320px] ${
                highlightedRawLine ? 'border-amber-300 ring-2 ring-amber-100' : 'border-zinc-300'
              }`}
              value={editorJson}
              onChange={(event) => onEditorJsonChange(event.target.value)}
              onFocus={() => {
                if (highlightedRawLine) {
                  rawHighlightInteractedRef.current = true;
                }
              }}
              onBlur={() => {
                if (rawHighlightInteractedRef.current) {
                  rawHighlightInteractedRef.current = false;
                  onDismissHighlightedRawLine();
                }
              }}
              placeholder="Abre un archivo para empezar a editar su JSON..."
              disabled={!editorFileId}
            />
          </div>
        )
      ) : (
        <div className="mt-4">
          {/* Toolbar: search + add + reference + issues badge */}
          <div className="flex items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Search
                size={15}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
              />
              <Input
                className="pl-9"
                value={visualSearchInput}
                onChange={(event) => setVisualSearchInput(event.target.value)}
                placeholder="Buscar por clave o texto..."
                disabled={!editorFileId}
              />
            </div>

            {treeReferenceEntries && treeReferenceEntries.length > 0 && (
              <ReferenceToggle active={showReferenceOverlay} onChange={onShowReferenceOverlayChange} />
            )}

            {sortedIssues.length > 0 && (
              <IssuesBadgeButton
                pending={sortedIssues.length - sortedIssues.filter((i) => resolvedIssueIds.has(i.id)).length}
                panelOpen={issuesPanelOpen}
                onToggle={handleIssuesBadgeToggle}
              />
            )}

            {editorFileId && !showAddForm && (
              <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={() => setShowAddForm(true)}>
                <Plus size={13} className="mr-1" />
                Añadir clave
              </Button>
            )}
          </div>

          {editorFileId && showAddForm && (
            <div className="mt-2 rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Nueva clave</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  value={addPath}
                  onChange={(e) => setAddPath(e.target.value)}
                  placeholder="ej: auth.login"
                  className="flex-1"
                />
                <Input
                  value={addValue}
                  onChange={(e) => setAddValue(e.target.value)}
                  placeholder="valor de traducción"
                  className="flex-1"
                />
              </div>
              <div className="mt-2 flex gap-2">
                <Button
                  size="sm"
                  disabled={!addPath.trim()}
                  onClick={() => {
                    if (!addPath.trim()) return;
                    onAddEntry(addPath.trim(), addValue);
                    setShowAddForm(false);
                    setAddPath('');
                    setAddValue('');
                  }}
                >
                  Añadir
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setShowAddForm(false);
                    setAddPath('');
                    setAddValue('');
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          <div className="mt-3 max-h-[560px] overflow-auto pr-1">
            {!editorFileId ? (
              <p className="text-base text-zinc-500">Abre un archivo para empezar.</p>
            ) : filteredVisualEntries.length === 0 ? (
              <p className="text-base text-zinc-500">
                No hay resultados con el filtro actual o no hay claves string editables.
              </p>
            ) : (
              <div className="space-y-3">
                {filteredVisualEntries.map((entry) => {
                  const refValue = showReferenceOverlay
                    ? treeReferenceEntries?.find((r) => r.path === entry.path)?.value
                    : undefined;
                  const entryIssue = currentFileIssues.find((i) => i.key === entry.path);
                  const isHighlighted = highlightedVisualPath === entry.path;
                  return (
                    <div
                      key={entry.path}
                      id={`visual-entry-${entry.path}`}
                      className={`rounded-lg border px-3 pb-3 pt-2.5 transition-colors ${
                        isHighlighted
                          ? 'border-amber-300 bg-amber-50/60'
                          : entryIssue
                            ? VISUAL_ISSUE_ROW_CLASS[entryIssue.type]
                            : 'border-zinc-200 bg-white'
                      }`}
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="inline-flex rounded bg-zinc-100 px-2 py-1 font-mono text-xs font-semibold text-zinc-700">
                          {entry.path}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {entryIssue && (
                            <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${VISUAL_ISSUE_BADGE_CLASS[entryIssue.type]}`}>
                              {VISUAL_ISSUE_LABEL[entryIssue.type]}
                            </span>
                          )}
                          <button
                            type="button"
                            className="shrink-0 rounded p-1 text-zinc-300 hover:bg-red-50 hover:text-red-500"
                            onClick={() => setDeletingPath(entry.path)}
                            title="Eliminar clave"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                      {refValue !== undefined && (
                        <p className="mb-1.5 rounded-md border border-zinc-100 bg-zinc-50 px-3 py-2 text-sm leading-relaxed text-zinc-400 italic">
                          <span className="not-italic font-medium text-zinc-300 mr-1.5">ref:</span>
                          {refValue || <span className="text-zinc-300">—</span>}
                        </p>
                      )}
                      <textarea
                        rows={entry.value.split('\n').length > 2 ? entry.value.split('\n').length + 1 : 2}
                        className="w-full resize-none rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm leading-relaxed text-zinc-900 outline-none focus:border-zinc-500"
                        value={entry.value}
                        onChange={(event) => onEditorVisualEntryChange(entry.path, event.target.value)}
                        onFocus={() => {
                          if (highlightedVisualPath === entry.path) {
                            visualHighlightFocusedPathRef.current = entry.path;
                          }
                        }}
                        onBlur={() => {
                          if (visualHighlightFocusedPathRef.current === entry.path) {
                            visualHighlightFocusedPathRef.current = null;
                            onDismissHighlightedVisualPath();
                          }
                        }}
                        disabled={!editorFileId}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}


      <Dialog open={Boolean(deletingPath)} onOpenChange={(open: boolean) => !open && setDeletingPath(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar clave</DialogTitle>
            <DialogDescription>
              Vas a eliminar "{deletingPath ?? ''}". Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setDeletingPath(null)}>
              Cancelar
            </Button>
            <Button
              type="button"
              className="border-rose-300 bg-rose-100 text-rose-900 hover:bg-rose-200"
              onClick={() => {
                if (deletingPath) {
                  onDeleteEntry(deletingPath);
                }
                setDeletingPath(null);
              }}
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Issues floating panel — rendered once, survives mode/file changes ── */}
      {issuesPanelOpen && issuesPanelPos && (
        <div
          ref={issuesPanelRef}
          className="fixed z-50 flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl"
          style={{ left: issuesPanelPos.x, top: issuesPanelPos.y, width: issuesPanelSize.w, height: issuesPanelSize.h }}
        >
          <div
            className="flex shrink-0 cursor-grab items-center justify-between border-b border-zinc-100 px-3 py-2 active:cursor-grabbing"
            onMouseDown={handleIssuesDragStart}
          >
            <div className="flex select-none items-center gap-2">
              {(() => {
                const resolvedCount = sortedIssues.filter((i) => resolvedIssueIds.has(i.id)).length;
                const pending = sortedIssues.length - resolvedCount;
                if (resolvedCount === 0) return null;
                return (
                  <>
                    <span className="flex items-center gap-1 text-xs text-emerald-600">
                      <CheckCircle2 size={12} />
                      {resolvedCount}/{sortedIssues.length}
                    </span>
                    <button
                      type="button"
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => { e.stopPropagation(); setIssuesHideResolved((v) => !v); }}
                      className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                        issuesHideResolved ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700'
                      }`}
                    >
                      <EyeOff size={10} />
                      {issuesHideResolved ? `${pending} pendientes` : 'Ocultar resueltos'}
                    </button>
                  </>
                );
              })()}
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={sortedIssues.findIndex((i) => i.id === activeIssueId) <= 0}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  const idx = sortedIssues.findIndex((i) => i.id === activeIssueId);
                  if (idx > 0) onGoToIssue(sortedIssues[idx - 1]);
                }}
                className="rounded p-0.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 disabled:opacity-30"
              >
                <ChevronLeft size={13} />
              </button>
              <button
                type="button"
                disabled={(() => {
                  const idx = sortedIssues.findIndex((i) => i.id === activeIssueId);
                  return idx !== -1 && idx >= sortedIssues.length - 1;
                })()}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  const idx = sortedIssues.findIndex((i) => i.id === activeIssueId);
                  if (idx === -1) onGoToIssue(sortedIssues[0]);
                  else if (idx < sortedIssues.length - 1) onGoToIssue(sortedIssues[idx + 1]);
                }}
                className="rounded p-0.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 disabled:opacity-30"
              >
                <ChevronRight size={13} />
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => setIssuesPanelOpen(false)}
                className="ml-1 rounded p-0.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
              >
                <Minimize2 size={13} />
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <EditorIssueList
              issues={sortedIssues}
              activeIssueId={activeIssueId}
              resolvedIssueIds={resolvedIssueIds}
              hideResolved={issuesHideResolved}
              languageNameById={languageNameById}
              onGoToIssue={onGoToIssue}
              onFixIncorrectNesting={onFixIncorrectNesting}
            />
          </div>

          <div
            className="absolute bottom-0 right-0 h-4 w-4 cursor-se-resize"
            onMouseDown={handleIssuesResizeStart}
          >
            <svg viewBox="0 0 16 16" className="h-full w-full text-zinc-300">
              <path d="M12 4 L4 12 M16 8 L8 16 M16 12 L12 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}
