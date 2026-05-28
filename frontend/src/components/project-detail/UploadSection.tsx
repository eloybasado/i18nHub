import { ChevronDown, ChevronUp, FilePenLine, FileUp, FolderTree, Info, Trash2 } from 'lucide-react';
import type { ChangeEvent, DragEvent } from 'react';
import { useMemo, useState } from 'react';
import type { FileGroup, I18nPattern, TranslationFileSummary } from '../../lib/types';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select } from '../ui/select';

type UploadGroupingMode = 'LANGUAGE' | 'GROUP';

export type IngestFileItem = {
  path: string;
  content: unknown;
};

type UploadFileMeta = {
  languageCode: string;
  groupName: string;
};

type GroupedUploadBucket<TFile> = {
  key: string;
  title: string;
  files: TFile[];
};

type UploadSectionProps = {
  pattern?: I18nPattern;
  hasConfiguredLanguages: boolean;
  isDraggingFiles: boolean;
  ingestFiles: IngestFileItem[];
  translationFiles: TranslationFileSummary[];
  fileGroups: FileGroup[];
  loading: boolean;
  onDropFiles: (event: DragEvent<HTMLDivElement>) => void | Promise<void>;
  onDragOverFiles: (event: DragEvent<HTMLDivElement>) => void;
  onDragLeaveFiles: (event: DragEvent<HTMLDivElement>) => void;
  onPickFiles: (event: ChangeEvent<HTMLInputElement>) => void | Promise<void>;
  onIngest: () => void | Promise<void>;
  onGoToLanguages: () => void;
  onEditFile: (fileId: string) => void | Promise<void>;
  onDeleteFile: (file: TranslationFileSummary) => void;
  onDeleteFileGroup: (fileGroupId: string) => void;
};

const parseUploadFileMeta = (pattern: I18nPattern | undefined, rawPath: string): UploadFileMeta => {
  const normalizedPath = rawPath.replace(/\\/g, '/');
  const filename = normalizedPath.split('/').pop() || rawPath;
  const stem = filename.endsWith('.json') ? filename.slice(0, -'.json'.length) : filename;

  if (pattern === 'SINGLE_FILE') {
    return {
      languageCode: stem.toLowerCase(),
      groupName: 'default',
    };
  }

  if (pattern === 'FOLDER_PER_LOCALE') {
    const parts = normalizedPath.split('/').filter(Boolean);
    return {
      languageCode: (parts.at(-2) || 'sin-detectar').toLowerCase(),
      groupName: stem || 'default',
    };
  }

  if (pattern === 'SUFFIX') {
    const match = stem.match(/^(.*?)[._-]([a-zA-Z]{2,}(?:[-_][a-zA-Z0-9]+)*)$/);
    return {
      languageCode: (match?.[2] || 'sin-detectar').toLowerCase(),
      groupName: match?.[1] || stem || 'default',
    };
  }

  if (pattern === 'PREFIX') {
    const match = stem.match(/^([a-zA-Z]{2,}(?:[-_][a-zA-Z0-9]+)*)[._-](.+)$/);
    return {
      languageCode: (match?.[1] || 'sin-detectar').toLowerCase(),
      groupName: match?.[2] || stem || 'default',
    };
  }

  return {
    languageCode: 'sin-detectar',
    groupName: stem || 'default',
  };
};

const sortGroupedBuckets = <TFile,>(buckets: GroupedUploadBucket<TFile>[]) => {
  return [...buckets].sort((left, right) => left.title.localeCompare(right.title));
};

export function UploadSection({
  pattern,
  hasConfiguredLanguages,
  isDraggingFiles,
  ingestFiles,
  translationFiles,
  fileGroups,
  loading,
  onDropFiles,
  onDragOverFiles,
  onDragLeaveFiles,
  onPickFiles,
  onIngest,
  onGoToLanguages,
  onEditFile,
  onDeleteFile,
  onDeleteFileGroup,
}: UploadSectionProps) {
  const [uploadGroupingMode, setUploadGroupingMode] = useState<UploadGroupingMode>('LANGUAGE');
  const [uploadSearch, setUploadSearch] = useState('');
  const [collapsedIngestBuckets, setCollapsedIngestBuckets] = useState<Record<string, boolean>>({});
  const [collapsedStoredBuckets, setCollapsedStoredBuckets] = useState<Record<string, boolean>>({});

  const emptyFileGroups = useMemo(
    () => fileGroups.filter((g) => g._count.translationFiles === 0),
    [fileGroups],
  );

  const filteredIngestFiles = useMemo(() => {
    const normalizedQuery = uploadSearch.trim().toLowerCase();
    if (!normalizedQuery) {
      return ingestFiles;
    }

    return ingestFiles.filter((file) => {
      const meta = parseUploadFileMeta(pattern, file.path);
      return (
        file.path.toLowerCase().includes(normalizedQuery) ||
        meta.languageCode.includes(normalizedQuery) ||
        meta.groupName.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [ingestFiles, pattern, uploadSearch]);

  const groupedIngestFiles = useMemo(() => {
    const groups = new Map<string, GroupedUploadBucket<IngestFileItem>>();

    filteredIngestFiles.forEach((file) => {
      const meta = parseUploadFileMeta(pattern, file.path);
      const key = uploadGroupingMode === 'LANGUAGE' ? `language:${meta.languageCode}` : `group:${meta.groupName}`;
      const title = uploadGroupingMode === 'LANGUAGE' ? meta.languageCode : meta.groupName;
      const existing = groups.get(key);

      if (existing) {
        existing.files.push(file);
        return;
      }

      groups.set(key, {
        key,
        title,
        files: [file],
      });
    });

    return sortGroupedBuckets(Array.from(groups.values())).map((bucket) => ({
      ...bucket,
      files: [...bucket.files].sort((left, right) => left.path.localeCompare(right.path)),
    }));
  }, [filteredIngestFiles, pattern, uploadGroupingMode]);

  const groupedStoredFiles = useMemo(() => {
    const groups = new Map<string, GroupedUploadBucket<TranslationFileSummary>>();

    translationFiles.forEach((file) => {
      const key = uploadGroupingMode === 'LANGUAGE' ? `language:${file.language.code}` : `group:${file.fileGroup.name}`;
      const title = uploadGroupingMode === 'LANGUAGE' ? file.language.name : file.fileGroup.name;
      const existing = groups.get(key);

      if (existing) {
        existing.files.push(file);
        return;
      }

      groups.set(key, {
        key,
        title,
        files: [file],
      });
    });

    return sortGroupedBuckets(Array.from(groups.values())).map((bucket) => ({
      ...bucket,
      files: [...bucket.files].sort((left, right) => left.filename.localeCompare(right.filename)),
    }));
  }, [translationFiles, uploadGroupingMode]);

  const toggleIngestBucket = (key: string) => {
    setCollapsedIngestBuckets((previous) => ({
      ...previous,
      [key]: !previous[key],
    }));
  };

  const toggleStoredBucket = (key: string) => {
    setCollapsedStoredBuckets((previous) => ({
      ...previous,
      [key]: !previous[key],
    }));
  };

  const setAllIngestBucketsCollapsed = (collapsed: boolean) => {
    setCollapsedIngestBuckets(Object.fromEntries(groupedIngestFiles.map((bucket) => [bucket.key, collapsed])));
  };

  const setAllStoredBucketsCollapsed = (collapsed: boolean) => {
    setCollapsedStoredBuckets(Object.fromEntries(groupedStoredFiles.map((bucket) => [bucket.key, collapsed])));
  };

  const uploadEnabled = hasConfiguredLanguages;
  const dropzoneInteractive = uploadEnabled && !loading;

  return (
    <div className="mt-2">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
        <FileUp size={16} />
        Carga de traducciones
      </h2>

      <p className="mt-2 text-sm text-zinc-600">
        Organiza archivos en carpetas visuales por idioma o por grupo para navegar mejor colecciones grandes.
      </p>

      <div className="mt-3 grid items-center gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
        <Input
          value={uploadSearch}
          onChange={(event) => setUploadSearch(event.target.value)}
          placeholder="Buscar por ruta, idioma o grupo..."
        />
        <Select
          value={uploadGroupingMode}
          onChange={(event) => setUploadGroupingMode(event.target.value as UploadGroupingMode)}
        >
          <option value="LANGUAGE">Agrupar por idioma</option>
          <option value="GROUP">Agrupar por grupo/namespace</option>
        </Select>
      </div>

      {!uploadEnabled ? (
        <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          <div className="flex items-start gap-2">
            <Info size={16} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">Carga temporalmente desactivada</p>
              <p className="mt-1 text-amber-800">
                Primero configura al menos un idioma para poder mapear correctamente los archivos JSON.
              </p>
              <Button type="button" size="sm" variant="outline" className="mt-3" onClick={onGoToLanguages}>
                Ir a Idiomas
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <div
        className={`mt-3 rounded-xl border-2 border-dashed p-5 transition-colors ${
          !uploadEnabled
            ? 'cursor-not-allowed border-zinc-200 bg-zinc-100/70'
            : isDraggingFiles
              ? 'border-zinc-700 bg-zinc-50'
              : 'border-zinc-300 bg-zinc-50/40'
        }`}
        onDrop={dropzoneInteractive ? onDropFiles : undefined}
        onDragOver={dropzoneInteractive ? onDragOverFiles : undefined}
        onDragLeave={dropzoneInteractive ? onDragLeaveFiles : undefined}
      >
        <p className="text-sm font-medium text-zinc-800">Arrastra archivos JSON aqui</p>
        <p className="mt-1 text-xs text-zinc-600">
          {uploadEnabled
            ? 'Tambien puedes seleccionar archivos o una carpeta desde Finder.'
            : 'Activa la carga configurando idiomas en la sección correspondiente.'}
        </p>
        <Input
          className="mt-3 block bg-white"
          type="file"
          accept=".json,application/json"
          multiple
          disabled={!uploadEnabled}
          onChange={onPickFiles}
          // @ts-expect-error - this attribute is supported by Chromium browsers.
          webkitdirectory=""
        />
      </div>

      {ingestFiles.length > 0 ? (
        <div className="mt-3 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-600">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-zinc-100 px-2 py-1">{filteredIngestFiles.length} seleccionados</span>
              <span className="rounded-full bg-zinc-100 px-2 py-1">{groupedIngestFiles.length} carpetas</span>
            </div>
            <div className="flex items-center gap-1">
              <Button type="button" variant="outline" size="sm" onClick={() => setAllIngestBucketsCollapsed(true)}>
                Colapsar todo
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setAllIngestBucketsCollapsed(false)}>
                Expandir todo
              </Button>
            </div>
          </div>

          <div className="max-h-[62vh] overflow-y-auto rounded-xl border border-zinc-200 bg-zinc-50/40 p-2">
            <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-2">
              {groupedIngestFiles.map((bucket) => {
                const isCollapsed = Boolean(collapsedIngestBuckets[bucket.key]);

                return (
                  <div
                    key={bucket.key}
                    className="h-fit overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm"
                  >
                    <button
                      type="button"
                      className="flex w-full items-center justify-between px-3 py-2.5 text-left"
                      onClick={() => toggleIngestBucket(bucket.key)}
                    >
                      <span className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
                        <FolderTree size={14} className="text-zinc-600" />
                        {bucket.title}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
                        {bucket.files.length} archivo(s)
                        {isCollapsed ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
                      </span>
                    </button>

                    {!isCollapsed ? (
                      <ul className="max-h-52 divide-y divide-zinc-100 overflow-auto border-t border-zinc-200 bg-white">
                        {bucket.files.map((file) => (
                          <li key={file.path} className="px-3 py-2 text-sm text-zinc-700">
                            {file.path}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <p className="mt-3 text-sm text-zinc-500">
          {uploadEnabled
            ? 'Todavia no has seleccionado archivos.'
            : 'Añade un idioma para habilitar la selección de archivos.'}
        </p>
      )}

      <div className="mt-3">
        <Button type="button" onClick={onIngest} disabled={loading || ingestFiles.length === 0 || !uploadEnabled}>
          {loading ? 'Cargando...' : 'Cargar archivos'}
        </Button>
      </div>

      <h3 className="mt-6 text-sm font-semibold text-zinc-900">Archivos ya cargados</h3>

      {emptyFileGroups.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-semibold text-zinc-700">Grupos sin archivos</h4>
          <p className="mt-1 text-xs text-zinc-500">
            Estos grupos existen en la base de datos pero no tienen archivos. Puedes eliminarlos para evitar
            problemas en el análisis.
          </p>
          <ul className="mt-2 space-y-1">
            {emptyFileGroups.map((group) => (
              <li key={group.id} className="flex items-center justify-between rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
                <span className="flex items-center gap-2 text-sm text-amber-800">
                  <FolderTree size={14} />
                  {group.name}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 border-red-300 px-2 text-xs text-red-800 hover:bg-red-100 hover:text-red-900"
                  onClick={() => onDeleteFileGroup(group.id)}
                >
                  <Trash2 size={12} className="mr-1" />
                  Eliminar
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {translationFiles.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500">No hay archivos cargados en el proyecto.</p>
      ) : (
        <div className="mt-3 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-600">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-zinc-100 px-2 py-1">{translationFiles.length} archivos</span>
              <span className="rounded-full bg-zinc-100 px-2 py-1">{groupedStoredFiles.length} carpetas</span>
            </div>
            <div className="flex items-center gap-1">
              <Button type="button" variant="outline" size="sm" onClick={() => setAllStoredBucketsCollapsed(true)}>
                Colapsar todo
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setAllStoredBucketsCollapsed(false)}>
                Expandir todo
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 items-start gap-2 md:grid-cols-2">
            {groupedStoredFiles.map((bucket) => {
              const isCollapsed = Boolean(collapsedStoredBuckets[bucket.key]);

              return (
                <div
                  key={bucket.key}
                  className="h-fit overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm"
                >
                  <button
                    type="button"
                    className="flex w-full items-center justify-between bg-zinc-50 px-3 py-2.5 text-left"
                    onClick={() => toggleStoredBucket(bucket.key)}
                  >
                    <span className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
                      <FolderTree size={14} className="text-zinc-600" />
                      {bucket.title}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
                      {bucket.files.length} archivo(s)
                      {isCollapsed ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
                    </span>
                  </button>

                  {!isCollapsed ? (
                    <ul className="max-h-72 divide-y divide-zinc-100 overflow-auto border-t border-zinc-200 bg-white">
                      {bucket.files.map((file) => (
                        <li key={file.id} className="flex items-start justify-between gap-3 px-3 py-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-zinc-900">{file.filename}</p>
                            <p className="mt-0.5 text-xs text-zinc-500">
                              Grupo: {file.fileGroup.name} · {file.language.name} ({file.language.code})
                            </p>
                          </div>

                          <div className="flex shrink-0 items-center gap-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => onEditFile(file.id)}
                            >
                              <FilePenLine size={12} className="mr-1" />
                              Editar
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 border-red-300 px-2 text-xs text-red-800 hover:bg-red-100 hover:text-red-900"
                              onClick={() => onDeleteFile(file)}
                            >
                              <Trash2 size={12} className="mr-1" />
                              Eliminar
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
