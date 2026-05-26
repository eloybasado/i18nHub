import { CheckCircle2, Circle } from 'lucide-react';
import { Button } from '../ui/button';

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

export function AiSuggestionReviewList({
  aiSuggestions,
  onToggleAiSuggestion,
  onSelectAllAiSuggestions,
  onClearAiSuggestions,
  onApplySelectedAiSuggestions,
}: AiSuggestionReviewListProps) {
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
            <button
              type="button"
              className={`flex w-full flex-col rounded-lg border bg-white p-3 shadow-sm transition-colors text-left hover:bg-zinc-50 ${
                item.selected ? 'border-zinc-400' : 'border-zinc-200'
              }`}
              onClick={() => onToggleAiSuggestion(item.id)}
            >
            <div className="flex items-start gap-3">
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center text-zinc-800">
                {item.selected ? <CheckCircle2 size={24} /> : <Circle size={24} />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-base text-zinc-800">{item.key}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  <span className="rounded-full border border-zinc-300 bg-white px-2 py-0.5 text-xs text-zinc-600">
                    {item.fileGroupName}
                  </span>
                  <span className="rounded-full border border-zinc-300 bg-white px-2 py-0.5 text-xs text-zinc-600">
                    {item.issueType}
                  </span>
                  {!item.applicableToCurrentFile ? (
                    <span className="rounded-full border border-zinc-300 bg-white px-2 py-0.5 text-xs text-zinc-600">
                      Se aplica en otro archivo
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-sm text-zinc-600">Actual: {item.currentText || '∅'}</p>
                <p className="mt-1 text-sm font-medium text-zinc-900">Sugerido: {item.suggestion}</p>
                {item.reason ? <p className="mt-1 text-xs text-zinc-500">{item.reason}</p> : null}
              </div>
            </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
