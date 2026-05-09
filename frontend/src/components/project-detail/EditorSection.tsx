import {
  Archive,
  Bot,
  Braces,
  CircleHelp,
  Download,
  Eye,
  EyeOff,
  FilePenLine,
  FileSearch,
  Files,
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
import { ConfirmModal } from '../ui/confirm-modal';
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
  onSelectEditorFile: (fileId: string) => void;
  onResetEditorSelection: () => void;
  onChangeEditorMode: (mode: 'RAW' | 'VISUAL' | 'TREE') => void;
  onSaveEditorFile: () => void | Promise<void>;
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
  const [showAddForm, setShowAddForm] = useState(false);
  const [addPath, setAddPath] = useState('');
  const [addValue, setAddValue] = useState('');
  const [deletingPath, setDeletingPath] = useState<string | null>(null);
  const visualHighlightFocusedPathRef = useRef<string | null>(null);
  const rawHighlightInteractedRef = useRef(false);

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
                onSelectFile={onSelectEditorFile}
                onClearSelection={onResetEditorSelection}
                disabled={editorBusy}
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

          <div className="group relative">
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-zinc-300 bg-white text-zinc-600 transition-colors hover:bg-zinc-100"
              aria-label="Informacion sobre exportaciones"
            >
              <CircleHelp size={15} />
            </button>
            <div className="pointer-events-none absolute right-0 top-10 z-20 w-72 rounded-lg border border-zinc-200 bg-white p-3 text-sm text-zinc-700 opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
              Exportar JSON descarga solo el archivo que estas editando. Exportar ZIP descarga todos los archivos del
              proyecto.
            </div>
          </div>
        </div>
      </div>

      <EditorIssueList
        issues={sortedIssues}
        activeIssueId={activeIssueId}
        resolvedIssueIds={resolvedIssueIds}
        languageNameById={languageNameById}
        onGoToIssue={onGoToIssue}
        onFixIncorrectNesting={onFixIncorrectNesting}
      />

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

      {editorMode === 'TREE' ? (
        <div className="mt-3">
          {treeReferenceEntries && treeReferenceEntries.length > 0 && (
            <div className="mb-2 flex items-center justify-end">
              <button
                type="button"
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                  showReferenceOverlay
                    ? 'border-zinc-700 bg-zinc-900 text-white'
                    : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50'
                }`}
                onClick={() => onShowReferenceOverlayChange(!showReferenceOverlay)}
              >
                {showReferenceOverlay ? <Eye size={12} /> : <EyeOff size={12} />}
                Superponer referencia
              </button>
            </div>
          )}
          <JsonTreeEditor
            entries={editorVisualEntries}
            referenceEntries={treeReferenceEntries}
            showReference={showReferenceOverlay}
            issues={currentFileIssues}
            resolvedIssueIds={resolvedIssueIds}
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

            <div className="mt-2 text-right">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setRawExpanded(true)}
                disabled={!editorFileId}
              >
                <Maximize2 size={14} className="mr-1" />
                Modo ampliado
              </Button>
            </div>
          </div>
        )
      ) : (
        <div className="mt-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative w-full max-w-xl">
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
                  <div
                    key={entry.path}
                    id={`visual-entry-${entry.path}`}
                    className={`flex items-start gap-2 rounded-md border-b border-zinc-200 pb-4 ${
                      highlightedVisualPath === entry.path ? 'border-l-4 border-l-amber-400 bg-amber-50/70 px-2' : ''
                    }`}
                  >
                    <label className="flex-1">
                      <span className="inline-flex rounded bg-zinc-100 px-2 py-1 font-mono text-sm font-semibold text-zinc-800">
                        {entry.path}
                      </span>
                      <textarea
                        className="mt-2 min-h-[110px] w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base leading-relaxed text-zinc-900 outline-none focus:border-zinc-500"
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
                    </label>
                    <button
                      type="button"
                      className="mt-1 shrink-0 rounded p-1.5 text-zinc-300 hover:bg-red-50 hover:text-red-500"
                      onClick={() => setDeletingPath(entry.path)}
                      title="Eliminar clave"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {editorFileId &&
            (showAddForm ? (
              <div className="mt-3 rounded-lg border border-dashed border-zinc-300 bg-zinc-50 p-3">
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
            ) : (
              <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => setShowAddForm(true)}>
                <Plus size={13} className="mr-1.5" />
                Añadir clave
              </Button>
            ))}
        </div>
      )}

      <div className="mt-5 border-t border-zinc-200 pt-4">
        <p className="text-base font-medium text-zinc-900">Crear/actualizar archivo en otro idioma</p>
        <p className="mt-1 text-sm text-zinc-600">
          Usa el asistente para elegir idioma destino y tipo de copia con explicación paso a paso.
        </p>

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
      </div>

      <div className="mt-5 border-t border-zinc-200 pt-4" />

      <ConfirmModal
        open={Boolean(deletingPath)}
        onOpenChange={(open) => !open && setDeletingPath(null)}
        title="Eliminar clave"
        description={`Vas a eliminar "${deletingPath ?? ''}". Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        onConfirm={() => {
          onDeleteEntry(deletingPath!);
          setDeletingPath(null);
        }}
      />
    </div>
  );
}
