import { CheckCircle2, Circle, Eye } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';

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

type AiSuggestionReviewListProps = {
  aiSuggestions: AiSuggestionCandidate[];
  onToggleAiSuggestion: (id: string) => void;
  onSelectAllAiSuggestions: () => void;
  onClearAiSuggestions: () => void;
  onApplySelectedAiSuggestions: () => void | Promise<void>;
};

const issueTypeLabel: Record<AiSuggestionCandidate['issueType'], string> = {
  MISSING_KEY: 'Clave faltante',
  UNUSED_KEY: 'Clave no usada',
  INTERPOLATION_MISMATCH: 'Interpolación distinta',
  INCORRECT_NESTING: 'Anidado incorrecto',
};

export function AiSuggestionReviewList({
  aiSuggestions,
  onToggleAiSuggestion,
  onSelectAllAiSuggestions,
  onClearAiSuggestions,
  onApplySelectedAiSuggestions,
}: AiSuggestionReviewListProps) {
  const [detailItem, setDetailItem] = useState<AiSuggestionCandidate | null>(null);

  if (aiSuggestions.length === 0) {
    return null;
  }

  const selectedCount = aiSuggestions.filter((item) => item.selected).length;

  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-base font-semibold text-zinc-900">
          Revisión IA: {selectedCount}/{aiSuggestions.length} seleccionadas
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" variant="outline" onClick={onSelectAllAiSuggestions}>
            Seleccionar todo
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={onClearAiSuggestions}>
            Descartar
          </Button>
          <Button type="button" size="sm" onClick={onApplySelectedAiSuggestions}>
            Aplicar seleccionadas
          </Button>
        </div>
      </div>

      <ul className="grid max-h-[24rem] gap-3 overflow-auto pr-1 sm:grid-cols-2">
        {aiSuggestions.map((item) => (
          <li key={item.id} className="flex">
            <div
              className={`relative flex w-full flex-col overflow-hidden rounded-lg border bg-white shadow-sm transition-colors duration-150 ${
                item.selected ? 'border-zinc-400' : 'border-zinc-200'
              }`}
            >
              <button
                type="button"
                className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-400 transition-colors duration-150 hover:border-zinc-300 hover:bg-zinc-50 hover:text-zinc-700"
                onClick={(e) => { e.stopPropagation(); setDetailItem(item); }}
                title="Ver detalle"
              >
                <Eye size={14} />
              </button>

              <button
                type="button"
                className="flex w-full flex-1 flex-col p-3 pr-11 text-left hover:bg-zinc-50"
                onClick={() => onToggleAiSuggestion(item.id)}
              >
                <div className="flex items-start gap-3">
                  <span className="relative inline-flex h-6 w-6 shrink-0 items-center justify-center text-zinc-800">
                    <CheckCircle2
                      size={24}
                      className={`absolute transition-opacity duration-150 ${item.selected ? 'opacity-100' : 'opacity-0'}`}
                    />
                    <Circle
                      size={24}
                      className={`absolute transition-opacity duration-150 ${item.selected ? 'opacity-0' : 'opacity-100'}`}
                    />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-base text-zinc-800">{item.key}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <span className="rounded-full border border-zinc-300 bg-white px-2 py-0.5 text-xs text-zinc-600">
                        {item.fileGroupName}
                      </span>
                      <span className="rounded-full border border-zinc-300 bg-white px-2 py-0.5 text-xs text-zinc-600">
                        {issueTypeLabel[item.issueType] ?? item.issueType}
                      </span>
                      {!item.targetTranslationFileId ? (
                        <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
                          Sin archivo destino
                        </span>
                      ) : !item.applicableToCurrentFile ? (
                        <span className="rounded-full border border-zinc-300 bg-white px-2 py-0.5 text-xs text-zinc-600">
                          Otro archivo
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 truncate text-sm text-zinc-500">
                      {item.currentText ? item.currentText : <span className="italic">∅ vacío</span>}
                    </p>
                    <p className="mt-1 truncate text-sm font-medium text-zinc-900">{item.suggestion}</p>
                  </div>
                </div>
              </button>
            </div>
          </li>
        ))}
      </ul>

      <Dialog open={detailItem !== null} onOpenChange={(open) => { if (!open) setDetailItem(null); }}>
        {detailItem && (
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-mono text-sm">{detailItem.key}</DialogTitle>
            </DialogHeader>

            <div className="mt-1 space-y-1 text-xs text-zinc-500">
              {detailItem.targetFilename && <p>Archivo: <span className="font-medium text-zinc-700">{detailItem.targetFilename}</span></p>}
              <p>Grupo: <span className="font-medium text-zinc-700">{detailItem.fileGroupName}</span></p>
              <p>Tipo: <span className="font-medium text-zinc-700">{issueTypeLabel[detailItem.issueType] ?? detailItem.issueType}</span></p>
            </div>

            <div className="mt-4 space-y-3">
              <div className="rounded-md border border-red-200 bg-red-50 p-3">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-red-500">Actual</p>
                <p className="text-sm text-red-800">
                  {detailItem.currentText || <span className="italic text-red-400">vacío / no existe</span>}
                </p>
              </div>

              <div className="rounded-md border border-green-200 bg-green-50 p-3">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-green-600">Sugerido</p>
                <p className="text-sm font-medium text-green-800">{detailItem.suggestion}</p>
              </div>

              {detailItem.reason && (
                <div className="rounded-md bg-zinc-50 p-3">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">Razón</p>
                  <p className="text-sm text-zinc-700">{detailItem.reason}</p>
                </div>
              )}
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  onToggleAiSuggestion(detailItem.id);
                  setDetailItem(null);
                }}
              >
                {detailItem.selected ? 'Deseleccionar' : 'Seleccionar'}
              </Button>
              <Button type="button" size="sm" onClick={() => setDetailItem(null)}>
                Cerrar
              </Button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
