import { useState } from 'react';
import {
  AlertTriangle,
  ArrowRightToLine,
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  EyeOff,
  FileSearch,
  TextSearch,
} from 'lucide-react';
import type { AnalysisIssue, AnalysisReport, IssueType, Language } from '../../lib/types';
import { notify } from '../../lib/toast';
import { Button } from '../ui/button';
import { Select } from '../ui/select';

type IssueTypeStats = {
  MISSING_KEY: number;
  UNUSED_KEY: number;
  INTERPOLATION_MISMATCH: number;
};

type AnalysisSectionProps = {
  loading: boolean;
  analysisReport: AnalysisReport | null;
  languages: Language[];
  issueTypeFilter: 'ALL' | IssueType;
  issueLanguageFilter: 'ALL' | string;
  issueTypeStats: IssueTypeStats;
  sortedFilteredIssues: AnalysisIssue[];
  expandedIssueId: string | null;
  projectHasReference: boolean;
  languageNameById: Map<string, Language>;
  fileGroupNameByReportId: Record<string, string>;
  onRunAnalysis: () => void | Promise<void>;
  onExportIssuesCsv: () => void;
  onIssueTypeFilterChange: (value: 'ALL' | IssueType) => void;
  onIssueLanguageFilterChange: (value: 'ALL' | string) => void;
  onClearIssueFilters: () => void;
  onToggleIssueExpanded: (issueId: string | null) => void;
  onGoToIssue: (issue: AnalysisIssue) => void | Promise<void>;
  issueTypeLabel: (type: IssueType) => string;
  formatIssueDetails: (details: Record<string, unknown> | null | undefined) => string;
};

export function AnalysisSection({
  loading,
  analysisReport,
  languages,
  issueTypeFilter,
  issueLanguageFilter,
  issueTypeStats,
  sortedFilteredIssues,
  expandedIssueId,
  projectHasReference,
  languageNameById,
  fileGroupNameByReportId,
  onRunAnalysis,
  onExportIssuesCsv,
  onIssueTypeFilterChange,
  onIssueLanguageFilterChange,
  onClearIssueFilters,
  onToggleIssueExpanded,
  onGoToIssue,
  issueTypeLabel,
  formatIssueDetails,
}: AnalysisSectionProps) {
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const issueTypeBadgeClass = (type: IssueType) => {
    if (type === 'MISSING_KEY') {
      return 'border-amber-300 bg-amber-50 text-amber-800';
    }

    if (type === 'UNUSED_KEY') {
      return 'border-blue-300 bg-blue-50 text-blue-800';
    }

    return 'border-rose-300 bg-rose-50 text-rose-800';
  };

  const groupedIssues = sortedFilteredIssues.reduce<Record<string, AnalysisIssue[]>>((acc, issue) => {
    const groupName = fileGroupNameByReportId[issue.reportId] ?? 'Grupo sin identificar';
    if (!acc[groupName]) {
      acc[groupName] = [];
    }

    acc[groupName].push(issue);
    return acc;
  }, {});

  const orderedGroups = Object.entries(groupedIssues).sort((a, b) => a[0].localeCompare(b[0], 'es'));

  const toggleGroupCollapse = (groupName: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName],
    }));
  };

  const collapseAllGroups = () => {
    setCollapsedGroups(Object.fromEntries(orderedGroups.map(([groupName]) => [groupName, true])));
  };

  const expandAllGroups = () => {
    setCollapsedGroups(Object.fromEntries(orderedGroups.map(([groupName]) => [groupName, false])));
  };

  const copyToClipboard = async (value: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(value);
      notify.success(successMessage);
    } catch {
      notify.error('No se pudo copiar al portapapeles');
    }
  };

  return (
    <div className="mt-2">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
        <FileSearch size={16} />
        Análisis de archivos
      </h2>

      <p className="mt-2 text-sm text-zinc-600">
        Ejecuta una comparacion contra el idioma de referencia para detectar claves faltantes, no usadas e
        interpolaciones inconsistentes.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" onClick={() => void onRunAnalysis()} disabled={loading}>
          {loading ? 'Analizando...' : 'Ejecutar análisis'}
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={onExportIssuesCsv}
          disabled={!analysisReport || sortedFilteredIssues.length === 0}
        >
          Exportar CSV (filtrado)
        </Button>
      </div>

      {analysisReport ? (
        <div className="mt-4">
          <h3 className="text-sm font-semibold text-zinc-900">Resultado del ultimo reporte</h3>

          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-zinc-600">Tipo de issue</label>
              <Select
                value={issueTypeFilter}
                onChange={(event) => onIssueTypeFilterChange(event.target.value as 'ALL' | IssueType)}
              >
                <option value="ALL">Todos</option>
                <option value="MISSING_KEY">Falta clave</option>
                <option value="UNUSED_KEY">Clave no usada</option>
                <option value="INTERPOLATION_MISMATCH">Interpolacion distinta</option>
              </Select>
            </div>

            <div>
              <label className="mb-1 block text-sm text-zinc-600">Idioma</label>
              <Select value={issueLanguageFilter} onChange={(event) => onIssueLanguageFilterChange(event.target.value)}>
                <option value="ALL">Todos</option>
                {languages.map((language) => (
                  <option key={language.id} value={language.id}>
                    {language.name} ({language.code})
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="mt-4 border-t border-zinc-200 pt-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-1 text-xs text-amber-800">
                Falta clave: {issueTypeStats.MISSING_KEY}
              </span>
              <span className="rounded-full border border-blue-300 bg-blue-50 px-2 py-1 text-xs text-blue-800">
                No usada: {issueTypeStats.UNUSED_KEY}
              </span>
              <span className="rounded-full border border-rose-300 bg-rose-50 px-2 py-1 text-xs text-rose-800">
                Interpolacion: {issueTypeStats.INTERPOLATION_MISMATCH}
              </span>
              <Button type="button" variant="outline" size="sm" onClick={onClearIssueFilters}>
                Limpiar filtros
              </Button>
            </div>
          </div>

          {analysisReport.issues.length > 0 ? (
            <p className="mt-3 text-sm text-zinc-600">
              Mostrando {sortedFilteredIssues.length} de {analysisReport.issues.length} issue(s)
            </p>
          ) : null}

          {sortedFilteredIssues.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-500">No se encontraron issues.</p>
          ) : (
            <div className="mt-3 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" size="sm" variant="outline" onClick={expandAllGroups}>
                  Expandir grupos
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={collapseAllGroups}>
                  Colapsar grupos
                </Button>
              </div>

              {orderedGroups.map(([groupName, issues]) => (
                <section key={groupName} className="rounded-lg border border-zinc-200 bg-white">
                  <header className="flex items-center justify-between border-b border-zinc-200 px-3 py-2">
                    <p className="text-sm font-semibold text-zinc-900">{groupName}</p>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs text-zinc-600">
                        {issues.length} issue(s)
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0"
                        aria-label={collapsedGroups[groupName] ? `Expandir grupo ${groupName}` : `Colapsar grupo ${groupName}`}
                        title={collapsedGroups[groupName] ? 'Expandir grupo' : 'Colapsar grupo'}
                        onClick={() => toggleGroupCollapse(groupName)}
                      >
                        {collapsedGroups[groupName] ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                      </Button>
                    </div>
                  </header>

                  <ul className={`divide-y divide-zinc-200 ${collapsedGroups[groupName] ? 'hidden' : ''}`}>
                    {issues.map((issue) => {
                      const language = languageNameById.get(issue.languageId);
                      const isExpanded = expandedIssueId === issue.id;
                      return (
                        <li key={issue.id} className="flex flex-wrap items-start justify-between gap-3 px-3 py-3">
                          <div>
                            <p className="text-sm font-semibold text-zinc-900">{issue.key}</p>
                            <p className="text-xs text-zinc-500">
                              {issueTypeLabel(issue.type)} ·{' '}
                              {language ? `${language.name} (${language.code})` : issue.languageId}
                            </p>
                            {isExpanded ? (
                              <p className="mt-2 text-xs leading-relaxed text-zinc-700">
                                {formatIssueDetails(issue.details)}
                              </p>
                            ) : null}
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full border px-2 py-1 text-xs ${issueTypeBadgeClass(issue.type)}`}
                            >
                              {issue.type}
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0"
                              aria-label="Copiar clave"
                              title="Copiar clave"
                              onClick={() => void copyToClipboard(issue.key, 'Clave copiada')}
                            >
                              <Copy size={14} />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0"
                              aria-label="Copiar detalle"
                              title="Copiar detalle"
                              onClick={() =>
                                void copyToClipboard(formatIssueDetails(issue.details), 'Detalle copiado')
                              }
                            >
                              <TextSearch size={14} />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0"
                              aria-label="Ir al error"
                              title="Ir al error"
                              onClick={() => void onGoToIssue(issue)}
                            >
                              <ArrowRightToLine size={14} />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0"
                              aria-label={isExpanded ? 'Ocultar detalle' : 'Ver detalle'}
                              title={isExpanded ? 'Ocultar detalle' : 'Ver detalle'}
                              onClick={() => onToggleIssueExpanded(isExpanded ? null : issue.id)}
                            >
                              {isExpanded ? <EyeOff size={14} /> : <Eye size={14} />}
                            </Button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="mt-3 text-sm text-zinc-500">Aún no hay un reporte cargado.</p>
      )}

      {!projectHasReference ? (
        <p className="mt-3 flex items-center gap-2 text-sm text-red-700">
          <AlertTriangle size={14} />
          Debes marcar un idioma de referencia antes de ejecutar el análisis.
        </p>
      ) : null}
    </div>
  );
}
