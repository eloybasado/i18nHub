import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../ui/button';

type IssuePagerProps = {
  currentIssueIndex: number;
  totalIssues: number;
  onGoToPreviousIssue: () => void;
  onGoToNextIssue: () => void;
};

export function IssuePager({ currentIssueIndex, totalIssues, onGoToPreviousIssue, onGoToNextIssue }: IssuePagerProps) {
  if (totalIssues <= 0) {
    return null;
  }

  const currentIssueNumber = currentIssueIndex >= 0 ? currentIssueIndex + 1 : 0;

  return (
    <div className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-1.5 py-1">
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8 w-8 shrink-0 p-0"
        aria-label="Issue anterior"
        title="Issue anterior"
        onClick={onGoToPreviousIssue}
      >
        <ChevronLeft size={14} />
      </Button>

      <span className="w-[84px] text-center font-mono text-xs font-semibold tabular-nums text-zinc-700">
        {`${currentIssueNumber}/${totalIssues}`}
      </span>

      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8 w-8 shrink-0 p-0"
        aria-label="Issue siguiente"
        title="Issue siguiente"
        onClick={onGoToNextIssue}
      >
        <ChevronRight size={14} />
      </Button>
    </div>
  );
}
