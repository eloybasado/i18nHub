import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { FilePenLine, FileSearch, FileUp, Languages } from 'lucide-react';
import { Button } from '../ui/button';

type IssueTypeStats = {
  MISSING_KEY: number;
  UNUSED_KEY: number;
  INTERPOLATION_MISMATCH: number;
  INCORRECT_NESTING: number;
};

type SectionId = 'overview' | 'languages' | 'upload' | 'editor' | 'analysis';

type OverviewSectionProps = {
  patternLabel: string;
  languagesCount: number;
  translationFilesCount: number;
  issuesCount: number;
  referenceLanguageName: string;
  issueTypeStats: IssueTypeStats;
  onGoToSection: (sectionId: SectionId) => void;
};

export function OverviewSection({
  patternLabel,
  languagesCount,
  translationFilesCount,
  issuesCount,
  referenceLanguageName,
  issueTypeStats,
  onGoToSection,
}: OverviewSectionProps) {
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
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <span className="rounded-full border border-zinc-300 px-2 py-1 text-zinc-700">
            Falta clave: {issueTypeStats.MISSING_KEY}
          </span>
          <span className="rounded-full border border-zinc-300 px-2 py-1 text-zinc-700">
            No usada: {issueTypeStats.UNUSED_KEY}
          </span>
          <span className="rounded-full border border-zinc-300 px-2 py-1 text-zinc-700">
            Interp.: {issueTypeStats.INTERPOLATION_MISMATCH}
          </span>
          <span className="rounded-full border border-zinc-300 px-2 py-1 text-zinc-700">
            Anidado: {issueTypeStats.INCORRECT_NESTING}
          </span>
        </div>
      </div>

      <div className="mt-5 border-t border-zinc-200 pt-4">
        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Accesos rápidos</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => onGoToSection('languages')}>
            <Languages size={14} className="mr-1" />
            Ir a idiomas
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => onGoToSection('upload')}>
            <FileUp size={14} className="mr-1" />
            Cargar archivos
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => onGoToSection('editor')}>
            <FilePenLine size={14} className="mr-1" />
            Abrir editor
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => onGoToSection('analysis')}>
            <FileSearch size={14} className="mr-1" />
            Ver análisis
          </Button>
        </div>
      </div>
    </div>
  );
}
