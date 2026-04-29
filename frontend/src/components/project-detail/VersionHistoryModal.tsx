import { FileClock, RotateCcw } from 'lucide-react';
import type { TranslationFileVersionSummary } from '../../lib/types';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';

type VersionHistoryModalProps = {
  versions: TranslationFileVersionSummary[];
  versionsLoading: boolean;
  onRestoreVersion: (versionId: string) => void | Promise<void>;
  disabled?: boolean;
  isPro?: boolean;
  onProGate?: () => void;
};

export function VersionHistoryModal({
  versions,
  versionsLoading,
  onRestoreVersion,
  disabled,
  isPro = true,
  onProGate,
}: VersionHistoryModalProps) {
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
      </DialogContent>
    </Dialog>
  );
}
