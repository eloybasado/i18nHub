import {
  Archive,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Download,
  FileClock,
  FilePenLine,
  Maximize2,
  Minimize2,
  RotateCcw,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { Language, TranslationFileSummary, TranslationFileVersionSummary } from '../../lib/types';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select } from '../ui/select';

type EditorVisualEntry = {
  path: string;
  value: string;
};

type CloneMode = 'EMPTY_STRUCTURE' | 'COPY_CONTENT';

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
}: EditorSectionProps) {
  const rawEditorRef = useRef<HTMLTextAreaElement | null>(null);
  const [rawExpanded, setRawExpanded] = useState(false);
  const visualHighlightFocusedPathRef = useRef<string | null>(null);
  const rawHighlightInteractedRef = useRef(false);

  useEffect(() => {
    if (!highlightedVisualPath) {
      return;
    }

    const element = document.getElementById(`visual-entry-${highlightedVisualPath}`);
    if (element) {
      element.scrollIntoView({ block: 'center', behavior: 'smooth' });
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
    const charEnd = charStart + (lines[lineIndex]?.length ?? 0);

    textarea.focus();
    textarea.setSelectionRange(charStart, charEnd);
  }, [highlightedRawLine, editorJson]);

  return (
    <div className="mt-2">
      <h2 className="flex items-center gap-2 text-base font-semibold text-zinc-900">
        <FilePenLine size={16} />
        Editor integrado de traducciones
      </h2>

      <p className="mt-2 text-base text-zinc-600">
        Abre un archivo cargado, edita su JSON y guarda cambios para corregir issues o preparar nuevas traducciones.
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
                onResetEditorSelection();
                return;
              }
              onSelectEditorFile(value);
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
          {totalIssues > 0 ? (
            <div className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-1.5 py-1">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 w-8 p-0"
                aria-label="Issue anterior"
                title="Issue anterior"
                onClick={onGoToPreviousIssue}
              >
                <ChevronLeft size={14} />
              </Button>
              <span className="min-w-16 text-center text-xs text-zinc-600">
                {currentIssueIndex >= 0 ? `${currentIssueIndex + 1}/${totalIssues}` : `0/${totalIssues}`}
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-8 w-8 p-0"
                aria-label="Issue siguiente"
                title="Issue siguiente"
                onClick={onGoToNextIssue}
              >
                <ChevronRight size={14} />
              </Button>
            </div>
          ) : null}

          <Button
            type="button"
            className="border-sky-700 bg-sky-600 text-white shadow-sm hover:bg-sky-700"
            size="sm"
            disabled={!editorFileId || editorBusy}
            onClick={onDownloadCurrentEditedFile}
          >
            <Download size={14} className="mr-1.5" />
            Exportar JSON
          </Button>
          <Button
            type="button"
            className="border-emerald-700 bg-emerald-600 text-white shadow-sm hover:bg-emerald-700"
            size="sm"
            disabled={downloadBusy || translationFiles.length === 0}
            onClick={() => void onDownloadProjectZip()}
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
              Exportar JSON descarga solo el archivo que estas editando. Exportar ZIP descarga todos los archivos del
              proyecto.
            </div>
          </div>
        </div>
      </div>

      {editorMode === 'RAW' ? (
        <div className={rawExpanded ? 'fixed inset-x-4 bottom-6 top-24 z-50' : 'mt-3'}>
          <div className="mb-2 flex items-center justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRawExpanded((previous) => !previous)}
              disabled={!editorFileId}
            >
              {rawExpanded ? <Minimize2 size={14} className="mr-1" /> : <Maximize2 size={14} className="mr-1" />}
              {rawExpanded ? 'Salir de ampliado' : 'Modo ampliado'}
            </Button>
          </div>

          <textarea
            ref={rawEditorRef}
            className={`w-full rounded-lg border bg-white p-3 font-mono text-sm text-zinc-900 outline-none focus:border-zinc-500 ${
              rawExpanded ? 'h-[calc(100%-2.5rem)]' : 'min-h-[320px]'
            } ${highlightedRawLine ? 'border-sky-400 ring-1 ring-sky-300' : 'border-zinc-300'}`}
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
      ) : (
        <div className="mt-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Input
              className="max-w-xl"
              value={editorVisualQuery}
              onChange={(event) => onEditorVisualQueryChange(event.target.value)}
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
                  <label
                    key={entry.path}
                    id={`visual-entry-${entry.path}`}
                    className={`block rounded-md border-b border-zinc-200 pb-4 ${
                      highlightedVisualPath === entry.path ? 'border-l-4 border-l-sky-500 bg-sky-50/60 px-2' : ''
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
        <p className="mb-1 flex items-center gap-2 text-base font-medium text-zinc-900">
          <FileClock size={16} />
          Historial de versiones
        </p>
        <p className="text-sm text-zinc-600">Solo disponible para cuentas PRO. Se guarda snapshot automático antes de cada cambio.</p>

        {versionsLoading ? (
          <p className="mt-2 text-sm text-zinc-500">Cargando versiones...</p>
        ) : versions.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">No hay versiones disponibles para este archivo.</p>
        ) : (
          <ul className="mt-2 divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
            {versions.slice(0, 8).map((version) => (
              <li key={version.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-zinc-900">v{version.versionNumber}</p>
                  <p className="text-xs text-zinc-500">
                    {new Date(version.createdAt).toLocaleString('es-ES')} · {version.createdBy.name}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 w-8 p-0"
                  aria-label={`Restaurar versión ${version.versionNumber}`}
                  title={`Restaurar versión ${version.versionNumber}`}
                  onClick={() => void onRestoreVersion(version.id)}
                >
                  <RotateCcw size={14} />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

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
              onChange={(event) => onTargetLanguageChange(event.target.value)}
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
              onChange={(event) => onCloneModeChange(event.target.value as CloneMode)}
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
              onRequestCopyContent();
              return;
            }
            onCloneEmptyStructure();
          }}
        >
          {editorCloneMode === 'EMPTY_STRUCTURE'
            ? `Crear estructura vacia${selectedTargetLanguage ? ` en ${selectedTargetLanguage.code}` : ''}`
            : `Copiar contenido${selectedTargetLanguage ? ` en ${selectedTargetLanguage.code}` : ''}`}
        </Button>
      </div>

      <div className="mt-5 border-t border-zinc-200" />
    </div>
  );
}
