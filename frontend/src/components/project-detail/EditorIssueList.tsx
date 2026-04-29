import { CheckCircle2 } from 'lucide-react';
import type { AnalysisIssue, IssueType } from '../../lib/types';

type EditorIssueListProps = {
  issues: AnalysisIssue[];
  activeIssueId: string | null;
  resolvedIssueIds: Set<string>;
  languageNameById: Map<string, { name: string; code: string }>;
  onGoToIssue: (issue: AnalysisIssue) => void;
};

const BADGE_CLASS: Record<IssueType, string> = {
  MISSING_KEY: 'bg-red-100 text-red-700',
  UNUSED_KEY: 'bg-yellow-100 text-yellow-700',
  INTERPOLATION_MISMATCH: 'bg-orange-100 text-orange-700',
};

const ACTIVE_BORDER_CLASS: Record<IssueType, string> = {
  MISSING_KEY: 'border-l-red-400',
  UNUSED_KEY: 'border-l-yellow-400',
  INTERPOLATION_MISMATCH: 'border-l-orange-400',
};

const TYPE_LABEL: Record<IssueType, string> = {
  MISSING_KEY: 'Falta',
  UNUSED_KEY: 'Extra',
  INTERPOLATION_MISMATCH: 'Interpolación',
};

export function EditorIssueList({
  issues,
  activeIssueId,
  resolvedIssueIds,
  languageNameById,
  onGoToIssue,
}: EditorIssueListProps) {
  if (issues.length === 0) return null;

  const resolvedCount = issues.filter((i) => resolvedIssueIds.has(i.id)).length;

  return (
    <div className="mt-3 overflow-hidden rounded-lg border border-zinc-200 bg-white">
      <div className="flex items-center justify-between border-b border-zinc-100 px-3 py-2">
        <p className="text-xs font-semibold text-zinc-700">
          Issues del análisis
          <span className="ml-1.5 font-normal text-zinc-400">{issues.length}</span>
        </p>
        {resolvedCount > 0 && (
          <span className="flex items-center gap-1 text-xs text-emerald-600">
            <CheckCircle2 size={12} />
            {resolvedCount} resuelto{resolvedCount !== 1 ? 's' : ''} en este archivo
          </span>
        )}
      </div>

      <ul className="max-h-[220px] divide-y divide-zinc-100 overflow-y-auto">
        {issues.map((issue) => {
          const isActive = issue.id === activeIssueId;
          const isResolved = resolvedIssueIds.has(issue.id);
          const lang = languageNameById.get(issue.languageId);

          return (
            <li key={issue.id}>
              <button
                type="button"
                className={`flex w-full items-center gap-2 border-l-2 px-3 py-2 text-left transition-colors hover:bg-zinc-50 ${
                  isActive ? `bg-zinc-50 ${ACTIVE_BORDER_CLASS[issue.type]}` : 'border-l-transparent'
                } ${isResolved ? 'opacity-50' : ''}`}
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
            </li>
          );
        })}
      </ul>
    </div>
  );
}
