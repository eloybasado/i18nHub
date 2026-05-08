import { Eye, FileClock, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import type { TranslationFileVersionSummary } from '../../lib/types';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';

type VersionHistoryModalProps = {
  versions: TranslationFileVersionSummary[];
  versionsLoading: boolean;
  onRestoreVersion: (versionId: string) => void | Promise<void>;
  onViewVersion?: (versionId: string) => Promise<Record<string, unknown> | null>;
  disabled?: boolean;
  isPro?: boolean;
  onProGate?: () => void;
};

export function VersionHistoryModal({
  versions,
  versionsLoading,
  onRestoreVersion,
  onViewVersion,
  disabled,
  isPro = true,
  onProGate,
}: VersionHistoryModalProps) {
  const [previewVersionId, setPreviewVersionId] = useState<string | null>(null);
  const [previewContent, setPreviewContent] = useState<Record<string, unknown> | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const handleViewVersion = async (versionId: string) => {
    if (!onViewVersion) return;
    setPreviewLoading(true);
    setPreviewVersionId(versionId);
    try {
      const content = await onViewVersion(versionId);
      setPreviewContent(content);
    } catch {
      setPreviewContent(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  if (!isPro) {
    return (
      <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={onProGate}>
        <FileClock size={14} className="mr-1.5" />
        Historial versiones
        <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
          PRO
        </span>
      </Button>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" disabled={disabled}>
          <FileClock size={14} className="mr-1.5" />
          Historial versiones
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Historial de versiones</DialogTitle>
          <DialogDescription>
            Solo disponible para cuentas PRO. Se guarda snapshot automático antes de cada cambio.
          </DialogDescription>
        </DialogHeader>

        {versionsLoading ? (
          <p className="mt-2 text-sm text-zinc-500">Cargando versiones...</p>
        ) : versions.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">No hay versiones disponibles para este archivo.</p>
        ) : (
          <ul className="mt-2 max-h-[55vh] divide-y divide-zinc-200 overflow-auto rounded-lg border border-zinc-200 bg-white">
            {versions.slice(0, 20).map((version) => (
              <li key={version.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-zinc-900">v{version.versionNumber}</p>
                  <p className="text-xs text-zinc-500">
                    {new Date(version.createdAt).toLocaleString('es-ES')} · {version.createdBy.name}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 w-8 p-0"
                    aria-label={`Ver versión ${version.versionNumber}`}
                    title={`Ver versión ${version.versionNumber}`}
                    onClick={() => void handleViewVersion(version.id)}
                  >
                    <Eye size={14} />
                  </Button>
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
                </div>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>

      {/* Preview Modal */}
      <Dialog open={previewVersionId !== null} onOpenChange={(open) => !open && setPreviewVersionId(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Contenido de versión</DialogTitle>
            <DialogDescription>
              {previewLoading ? 'Cargando contenido...' : 'Vista previa del archivo en esta versión'}
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-48 max-h-[60vh] overflow-auto rounded-lg border border-zinc-200 bg-zinc-50">
            {previewLoading ? (
              <div className="flex items-center justify-center h-48">
                <p className="text-sm text-zinc-500">Cargando...</p>
              </div>
            ) : previewContent ? (
              <pre className="p-3 text-xs font-mono text-zinc-800 whitespace-pre-wrap break-words">
                {JSON.stringify(previewContent, null, 2)}
              </pre>
            ) : (
              <div className="flex items-center justify-center h-48">
                <p className="text-sm text-zinc-500">No se pudo cargar el contenido.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
