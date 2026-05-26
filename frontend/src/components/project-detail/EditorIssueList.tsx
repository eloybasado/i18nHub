import { CheckCircle2 } from 'lucide-react';
import type { AnalysisIssue, IssueType } from '../../lib/types';

type EditorIssueListProps = {
  issues: AnalysisIssue[];
  activeIssueId: string | null;
  resolvedIssueIds: Set<string>;
  hideResolved: boolean;
  languageNameById: Map<string, { name: string; code: string }>;
  onGoToIssue: (issue: AnalysisIssue) => void;
  onFixIncorrectNesting: (issue: AnalysisIssue) => void;
};

const BADGE_CLASS: Record<IssueType, string> = {
  MISSING_KEY: 'bg-red-100 text-red-700',
  UNUSED_KEY: 'bg-yellow-100 text-yellow-700',
  INTERPOLATION_MISMATCH: 'bg-orange-100 text-orange-700',
  INCORRECT_NESTING: 'bg-amber-100 text-amber-700',
};

const ACTIVE_BORDER_CLASS: Record<IssueType, string> = {
  MISSING_KEY: 'border-l-red-400',
  UNUSED_KEY: 'border-l-yellow-400',
  INTERPOLATION_MISMATCH: 'border-l-orange-400',
  INCORRECT_NESTING: 'border-l-amber-400',
};

const TYPE_LABEL: Record<IssueType, string> = {
  MISSING_KEY: 'Falta',
  UNUSED_KEY: 'Extra',
  INTERPOLATION_MISMATCH: 'Interpolación',
  INCORRECT_NESTING: 'Anidado',
};

export function EditorIssueList({
  issues,
  activeIssueId,
  resolvedIssueIds,
  hideResolved,
  languageNameById,
  onGoToIssue,
  onFixIncorrectNesting,
}: EditorIssueListProps) {
  if (issues.length === 0) return null;

  const visibleIssues = hideResolved ? issues.filter((i) => !resolvedIssueIds.has(i.id)) : issues;

  return (
    <ul className="divide-y divide-zinc-100">
        {visibleIssues.length === 0 ? (
          <li className="px-3 py-3 text-center text-xs text-emerald-600">
            <CheckCircle2 size={13} className="mx-auto mb-1" />
            Todos los issues resueltos
          </li>
        ) : (
          visibleIssues.map((issue) => {
            const isActive = issue.id === activeIssueId;
            const isResolved = resolvedIssueIds.has(issue.id);
            const lang = languageNameById.get(issue.languageId);

            return (
              <li key={issue.id}>
                <div
                  className={`flex w-full items-center gap-2 border-l-2 px-3 py-2 text-left transition-colors hover:bg-zinc-50 ${
                    isActive ? `bg-zinc-50 ${ACTIVE_BORDER_CLASS[issue.type]}` : 'border-l-transparent'
                  } ${isResolved ? 'opacity-50' : ''}`}
                >
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    onClick={() => onGoToIssue(issue)}
                  >
                    {isResolved ? (
                      <CheckCircle2 size={13} className="shrink-0 text-emerald-500" />
                    ) : (
                      <span className="h-3 w-3 shrink-0 rounded-full border border-zinc-300" />
                    )}
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${BADGE_CLASS[issue.type]}`}>
                      {TYPE_LABEL[issue.type]}
                    </span>
                    <span
                      className={`min-w-0 flex-1 truncate font-mono text-xs ${
                        isResolved ? 'text-zinc-400 line-through' : 'text-zinc-800'
                      }`}
                    >
                      {issue.key}
                    </span>
                    {lang && (
                      <span className="shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-zinc-500">
                        {lang.code}
                      </span>
                    )}
                  </button>

                  {issue.type === 'INCORRECT_NESTING' ? (
                    <button
                      type="button"
                      className="shrink-0 rounded border border-amber-300 bg-amber-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-800 transition-colors hover:bg-amber-200"
                      onClick={() => onFixIncorrectNesting(issue)}
                      title="Mover la clave a su ruta correcta"
                    >
                      Arreglar
                    </button>
                  ) : null}
                </div>
              </li>
            );
          })
        )}
      </ul>
  );
}
