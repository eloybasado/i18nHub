import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

type IssueTypeStats = {
  MISSING_KEY: number;
  UNUSED_KEY: number;
  INTERPOLATION_MISMATCH: number;
  INCORRECT_NESTING: number;
};

type OverviewSectionProps = {
  patternLabel: string;
  languagesCount: number;
  translationFilesCount: number;
  issuesCount: number;
  referenceLanguageName: string;
  issueTypeStats: IssueTypeStats;
  versionHistoryLimit: number;
  versionHistoryLimitDraft: string;
  versionHistoryLimitSaving: boolean;
  canEditVersionHistoryLimit: boolean;
  onVersionHistoryLimitDraftChange: (value: string) => void;
  onSaveVersionHistoryLimit: () => void | Promise<void>;
};

export function OverviewSection({
  patternLabel,
  languagesCount,
  translationFilesCount,
  issuesCount,
  referenceLanguageName,
  issueTypeStats,
  versionHistoryLimit,
  versionHistoryLimitDraft,
  versionHistoryLimitSaving,
  canEditVersionHistoryLimit,
  onVersionHistoryLimitDraftChange,
  onSaveVersionHistoryLimit,
}: OverviewSectionProps) {
  const issueBreakdown = [
    { label: 'Falta clave', value: issueTypeStats.MISSING_KEY, tone: 'bg-zinc-900' },
    { label: 'No usada', value: issueTypeStats.UNUSED_KEY, tone: 'bg-zinc-700' },
    { label: 'Interp.', value: issueTypeStats.INTERPOLATION_MISMATCH, tone: 'bg-zinc-500' },
    { label: 'Anidado', value: issueTypeStats.INCORRECT_NESTING, tone: 'bg-zinc-300' },
  ];
  const totalIssueTypes = issueBreakdown.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="relative">
      {/* Decorative space-cat Lottie (small, no container) */}
      <div className="pointer-events-none fixed right-0 bottom-0 z-50 hidden lg:block [mask-image:linear-gradient(to_bottom,transparent,black_30%)]">
        <DotLottieReact src="/animations/space-cat.lottie" loop autoplay className="h-[20vw] w-[20vw]" />
      </div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-zinc-900">Resumen del proyecto</p>
          <p className="mt-1 text-sm text-zinc-600">
            Vista general para comprobar estado de idiomas, archivos y análisis antes de editar o cargar nuevos
            contenidos.
          </p>
        </div>
        <span className="rounded-full border border-zinc-300 bg-zinc-100 px-2 py-1 text-xs text-zinc-700">
          Patron: {patternLabel}
        </span>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="border-l-2 border-zinc-300 pl-3">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Idiomas</p>
          <p className="mt-1 text-2xl font-semibold text-zinc-900">{languagesCount}</p>
          <p className="text-xs text-zinc-600">Configurados en el proyecto</p>
        </div>

        <div className="border-l-2 border-zinc-300 pl-3">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Archivos</p>
          <p className="mt-1 text-2xl font-semibold text-zinc-900">{translationFilesCount}</p>
          <p className="text-xs text-zinc-600">Total de traducciones cargadas</p>
        </div>

        <div className="border-l-2 border-zinc-300 pl-3">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Issues</p>
          <p className="mt-1 text-2xl font-semibold text-zinc-900">{issuesCount}</p>
          <p className="text-xs text-zinc-600">Del ultimo análisis ejecutado</p>
        </div>

        <div className="border-l-2 border-zinc-300 pl-3">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Referencia</p>
          <p className="mt-1 text-base font-semibold text-zinc-900">{referenceLanguageName}</p>
          <p className="text-xs text-zinc-600">Idioma base para comparaciones</p>
        </div>
      </div>

      <div className="mt-5 border-t border-zinc-200 pt-4">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Distribucion de issues</p>
        <div className="mt-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          {totalIssueTypes > 0 ? (
            <>
              <div className="flex h-2 overflow-hidden rounded-full bg-zinc-100">
                {issueBreakdown.map((issue) => (
                  <div
                    key={issue.label}
                    className={issue.tone}
                    style={{
                      width: `${(issue.value / totalIssueTypes) * 100}%`,
                    }}
                  />
                ))}
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {issueBreakdown.map((issue) => {
                  const percentage = Math.round((issue.value / totalIssueTypes) * 100);

                  return (
                    <div key={issue.label} className="flex items-center gap-3">
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${issue.tone}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="font-medium text-zinc-800">{issue.label}</span>
                          <span className="text-zinc-500">{issue.value}</span>
                        </div>
                        <div className="mt-2 h-2 rounded-full bg-zinc-100">
                          <div className={`${issue.tone} h-2 rounded-full`} style={{ width: `${percentage}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <p className="text-sm text-zinc-600">No hay issues en el ultimo análisis.</p>
          )}
        </div>
      </div>

      {canEditVersionHistoryLimit ? (
        <div className="mt-5 border-t border-zinc-200 pt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Ajustes</p>
          <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-zinc-900">Historial de versiones por archivo</p>
              <p className="mt-1 text-sm text-zinc-600">
                El proyecto conserva como máximo {versionHistoryLimit} versiones por archivo.
              </p>
            </div>

            <div className="flex min-w-[18rem] flex-col gap-2 sm:flex-row sm:items-end">
              <label className="block flex-1 text-sm text-zinc-700">
                Límite
                <Input
                  className="mt-1"
                  type="number"
                  min={1}
                  max={10}
                  value={versionHistoryLimitDraft}
                  onChange={(event) => onVersionHistoryLimitDraftChange(event.target.value)}
                />
              </label>
              <Button
                type="button"
                className="sm:mb-[2px]"
                disabled={
                  versionHistoryLimitSaving ||
                  !versionHistoryLimitDraft.trim() ||
                  versionHistoryLimitDraft.trim() === String(versionHistoryLimit)
                }
                onClick={() => void onSaveVersionHistoryLimit()}
              >
                {versionHistoryLimitSaving ? 'Guardando...' : 'Guardar ajuste'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
