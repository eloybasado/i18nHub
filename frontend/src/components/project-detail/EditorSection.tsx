import {
  Archive,
  Bot,
  Braces,
  CircleHelp,
  Download,
  FilePenLine,
  FileSearch,
  Files,
  ListFilter,
  Maximize2,
  Minimize2,
  Search,
  SearchCheck,
  TriangleAlert,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { Language, TranslationFileSummary, TranslationFileVersionSummary } from '../../lib/types';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { SelectModal, type SelectModalOption } from '../ui/select-modal';
import { AiSuggestionReviewList } from './AiSuggestionReviewList';
import { CloneToLanguageWizardModal } from './CloneToLanguageWizardModal';
import { EditorFilePickerModal } from './EditorFilePickerModal';
import { IssuePager } from './IssuePager';
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
  issueType: 'MISSING_KEY' | 'UNUSED_KEY' | 'INTERPOLATION_MISMATCH';
  fileGroupName: string;
  applicableToCurrentFile: boolean;
  selected: boolean;
};

type AiSuggestionScope = 'CURRENT_FILE_ISSUES' | 'ALL_FILES_ISSUES' | 'ALL_FILES_BY_TYPE';

type AiSuggestionIssueType = 'MISSING_KEY' | 'UNUSED_KEY' | 'INTERPOLATION_MISMATCH';

type CloneMode = 'EMPTY_STRUCTURE' | 'COPY_CONTENT';

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
];

type EditorSectionProps = {
  translationFiles: TranslationFileSummary[];
  editorFileId: string | null;
  editorFileMeta: TranslationFileSummary | null;
  editorMode: 'RAW' | 'VISUAL';
  editorBusy: boolean;
  editorJson: string;
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
  onChangeEditorMode: (mode: 'RAW' | 'VISUAL') => void;
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
  currentIssueIndex: number;
  totalIssues: number;
  onGoToPreviousIssue: () => void;
  onGoToNextIssue: () => void;
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
  onApplySelectedAiSuggestions: () => void;
};

export function EditorSection({
  translationFiles,
  editorFileId,
  editorFileMeta,
  editorMode,
  editorBusy,
  editorJson,
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
  currentIssueIndex,
  totalIssues,
  onGoToPreviousIssue,
  onGoToNextIssue,
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
}: EditorSectionProps) {
  const rawEditorRef = useRef<HTMLTextAreaElement | null>(null);
  const [rawExpanded, setRawExpanded] = useState(false);
  const [visualSearchInput, setVisualSearchInput] = useState(editorVisualQuery);
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

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Paso 1</p>
          <p className="mt-1 text-sm font-semibold text-zinc-900">Selecciona archivo</p>
          <p className="mt-1 text-xs text-zinc-500">Abre el archivo con el que vas a trabajar.</p>
          <EditorFilePickerModal
            translationFiles={translationFiles}
            selectedFileId={editorFileId}
            onSelectFile={onSelectEditorFile}
            onClearSelection={onResetEditorSelection}
            disabled={editorBusy}
          />
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Paso 2</p>
          <p className="mt-1 text-sm font-semibold text-zinc-900">Modo de edición</p>
          <p className="mt-1 text-xs text-zinc-500">Elige entre edición RAW o visual.</p>
          <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-1.5">
            <button
              type="button"
              className={`rounded px-3 py-2 text-sm font-medium transition-colors ${
                editorMode === 'RAW' ? 'bg-zinc-900 text-white' : 'text-zinc-700 hover:bg-zinc-100'
              }`}
              onClick={() => onChangeEditorMode('RAW')}
            >
              RAW
            </button>
            <button
              type="button"
              className={`rounded px-3 py-2 text-sm font-medium transition-colors ${
                editorMode === 'VISUAL' ? 'bg-zinc-900 text-white' : 'text-zinc-700 hover:bg-zinc-100'
              }`}
              onClick={() => onChangeEditorMode('VISUAL')}
            >
              Visual
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Paso 3</p>
          <p className="mt-1 text-sm font-semibold text-zinc-900">Guardar cambios</p>
          <p className="mt-1 text-xs text-zinc-500">Persistir cambios en el archivo seleccionado.</p>
          <Button
            className="mt-3 w-full"
            type="button"
            onClick={onSaveEditorFile}
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
          <IssuePager
            currentIssueIndex={currentIssueIndex}
            totalIssues={totalIssues}
            onGoToPreviousIssue={onGoToPreviousIssue}
            onGoToNextIssue={onGoToNextIssue}
          />

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

      <div className="mt-3 flex flex-wrap items-end gap-2">
        <div className="min-w-[220px] flex-1">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-500">Asistente IA</p>
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
        </Button>
      </div>

      <AiSuggestionReviewList
        aiSuggestions={aiSuggestions}
        onToggleAiSuggestion={onToggleAiSuggestion}
        onSelectAllAiSuggestions={onSelectAllAiSuggestions}
        onClearAiSuggestions={onClearAiSuggestions}
        onApplySelectedAiSuggestions={onApplySelectedAiSuggestions}
      />

      {editorMode === 'RAW' ? (
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
                  <label
                    key={entry.path}
                    id={`visual-entry-${entry.path}`}
                    className={`block rounded-md border-b border-zinc-200 pb-4 ${
                      highlightedVisualPath === entry.path ? 'border-l-4 border-l-amber-400 bg-amber-50/70 px-2' : ''
                    }`}
                  >
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
                ))}
              </div>
            )}
          </div>
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
        />
      </div>

      <div className="mt-5 border-t border-zinc-200 pt-4" />
    </div>
  );
}
