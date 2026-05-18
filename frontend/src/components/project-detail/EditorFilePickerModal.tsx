import { FilePenLine, FolderTree } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { TranslationFileSummary } from '../../lib/types';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Input } from '../ui/input';
import { Select } from '../ui/select';

type GroupingMode = 'LANGUAGE' | 'GROUP';

type GroupedBucket = {
  key: string;
  title: string;
  files: TranslationFileSummary[];
};

type EditorFilePickerModalProps = {
  translationFiles: TranslationFileSummary[];
  selectedFileId: string | null;
  onSelectFile: (fileId: string) => void;
  onClearSelection: () => void;
  disabled?: boolean;
  hasUnsavedChanges?: boolean;
};

const sortBuckets = (buckets: GroupedBucket[]) => {
  return [...buckets].sort((a, b) => a.title.localeCompare(b.title));
};

export function EditorFilePickerModal({
  translationFiles,
  selectedFileId,
  onSelectFile,
  onClearSelection,
  disabled,
  hasUnsavedChanges,
}: EditorFilePickerModalProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [groupingMode, setGroupingMode] = useState<GroupingMode>('LANGUAGE');

  const selectedFile = translationFiles.find((file) => file.id === selectedFileId) ?? null;

  useEffect(() => {
    if (!hasUnsavedChanges && open) {
      setOpen(false);
    }
  }, [hasUnsavedChanges, open]);

  const filteredFiles = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return translationFiles;
    }

    return translationFiles.filter((file) => {
      return (
        file.filename.toLowerCase().includes(q) ||
        file.language.code.toLowerCase().includes(q) ||
        file.language.name.toLowerCase().includes(q) ||
        file.fileGroup.name.toLowerCase().includes(q)
      );
    });
  }, [query, translationFiles]);

  const groupedFiles = useMemo(() => {
    const groups = new Map<string, GroupedBucket>();

    filteredFiles.forEach((file) => {
      const key = groupingMode === 'LANGUAGE' ? `language:${file.language.code}` : `group:${file.fileGroup.name}`;
      const title = groupingMode === 'LANGUAGE' ? `${file.language.name} (${file.language.code})` : file.fileGroup.name;
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

    return sortBuckets(Array.from(groups.values())).map((bucket) => ({
      ...bucket,
      files: [...bucket.files].sort((a, b) => a.filename.localeCompare(b.filename)),
    }));
  }, [filteredFiles, groupingMode]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="mt-2 w-full min-w-0 justify-start overflow-hidden"
          disabled={disabled}
          title={
            selectedFile
              ? `${selectedFile.fileGroup.name} · ${selectedFile.language.code} · ${selectedFile.filename}`
              : 'Selecciona un archivo para editar'
          }
        >
          <FilePenLine size={14} className="mr-2 shrink-0" />
          <span className="min-w-0 truncate text-left">
            {selectedFile
              ? `${selectedFile.fileGroup.name} · ${selectedFile.language.code} · ${selectedFile.filename}`
              : 'Selecciona un archivo para editar'}
          </span>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Seleccionar archivo</DialogTitle>
          <DialogDescription>Navega por idioma o por grupo para abrir un archivo en el editor.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por archivo, idioma o grupo..."
          />
          <Select value={groupingMode} onChange={(event) => setGroupingMode(event.target.value as GroupingMode)}>
            <option value="LANGUAGE">Agrupar por idioma</option>
            <option value="GROUP">Agrupar por grupo</option>
          </Select>
        </div>

        <div className="max-h-[56vh] overflow-auto rounded-xl bg-zinc-50/50 p-2">
          {groupedFiles.length === 0 ? (
            <p className="px-2 py-3 text-sm text-zinc-500">No hay archivos con ese filtro.</p>
          ) : (
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {groupedFiles.map((bucket) => (
                <div key={bucket.key} className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
                  <p className="flex items-center gap-2 border-b border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-900">
                    <FolderTree size={14} className="text-zinc-600" />
                    <span className="truncate">{bucket.title}</span>
                  </p>
                  <ul className="max-h-64 overflow-auto">
                    {bucket.files.map((file) => (
                      <li key={file.id} className="border-b border-zinc-100 last:border-b-0">
                        <button
                          type="button"
                          className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                            selectedFileId === file.id ? 'bg-zinc-900 text-white' : 'text-zinc-700 hover:bg-zinc-100'
                          }`}
                          onClick={() => {
                            onSelectFile(file.id);
                            if (!hasUnsavedChanges) {
                              setOpen(false);
                            }
                          }}
                        >
                          <p className="truncate font-medium">{file.filename}</p>
                          <p
                            className={`truncate text-xs ${selectedFileId === file.id ? 'text-zinc-200' : 'text-zinc-500'}`}
                          >
                            {file.language.code} · {file.fileGroup.name}
                          </p>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button type="button" variant="outline" onClick={onClearSelection} disabled={!selectedFileId}>
            Limpiar selección
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
