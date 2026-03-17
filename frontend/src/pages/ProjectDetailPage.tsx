import { AlertTriangle, FileSearch, FileUp, Languages, Star, Trash2 } from 'lucide-react';
import type { ChangeEvent, DragEvent, FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { apiRequest } from '../lib/api';
import { notify } from '../lib/toast';
import type {
  AnalysisReport,
  IngestResponse,
  IssueType,
  Language,
  Project,
  RunAnalysisResponse,
  TranslationFileSummary,
} from '../lib/types';

type IngestFileItem = {
  path: string;
  content: unknown;
};

const PATTERN_LABELS: Record<Project['i18nPattern'], string> = {
  SINGLE_FILE: 'Archivo unico por idioma',
  FOLDER_PER_LOCALE: 'Carpeta por idioma',
  SUFFIX: 'Sufijo (home_es.json)',
  PREFIX: 'Prefijo (es_home.json)',
};

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [translationFiles, setTranslationFiles] = useState<TranslationFileSummary[]>([]);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [ingestFiles, setIngestFiles] = useState<IngestFileItem[]>([]);
  const [analysisReport, setAnalysisReport] = useState<AnalysisReport | null>(null);
  const [issueTypeFilter, setIssueTypeFilter] = useState<'ALL' | IssueType>('ALL');
  const [issueLanguageFilter, setIssueLanguageFilter] = useState<'ALL' | string>('ALL');
  const [fileToDelete, setFileToDelete] = useState<TranslationFileSummary | null>(null);
  const [expandedIssueId, setExpandedIssueId] = useState<string | null>(null);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const parseFilesForIngest = async (files: File[]) => {
    try {
      const parsed = await Promise.all(
        files.map(async (file) => {
          const text = await file.text();
          const content = JSON.parse(text) as unknown;
          const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;

          return {
            path: relativePath,
            content,
          };
        }),
      );

      setIngestFiles(parsed);
      notify.info(`Archivos preparados: ${parsed.length}`);
    } catch {
      setIngestFiles([]);
      const message = 'Uno o varios archivos seleccionados no son JSON valido';
      setError(message);
      notify.error(message);
    }
  };

  const load = async () => {
    if (!projectId) return;

    try {
      const [projectData, languagesData, filesData] = await Promise.all([
        apiRequest<Project>(`/projects/${projectId}`, { auth: true }),
        apiRequest<Language[]>(`/projects/${projectId}/languages`, { auth: true }),
        apiRequest<TranslationFileSummary[]>(`/projects/${projectId}/translation-files`, { auth: true }),
      ]);
      setProject(projectData);
      setLanguages(languagesData);
      setTranslationFiles(filesData);
    } catch {
      setError('No se pudo cargar el proyecto');
    }
  };

  useEffect(() => {
    load();
  }, [projectId]);

  const onAddLanguage = async (event: FormEvent) => {
    event.preventDefault();
    if (!projectId) return;

    setLoading(true);
    setError('');

    try {
      await apiRequest(`/projects/${projectId}/languages`, {
        method: 'POST',
        auth: true,
        body: { code, name },
      });
      setCode('');
      setName('');
      notify.success('Idioma anadido correctamente');
      await load();
    } catch {
      const message = 'No se pudo anadir el idioma';
      setError(message);
      notify.error(message);
    } finally {
      setLoading(false);
    }
  };

  const setReference = async (languageId: string) => {
    if (!projectId) return;

    try {
      await apiRequest(`/projects/${projectId}/languages/reference`, {
        method: 'PATCH',
        auth: true,
        body: { languageId },
      });
      notify.success('Idioma de referencia actualizado');
      await load();
    } catch {
      const message = 'No se pudo establecer el idioma de referencia';
      setError(message);
      notify.error(message);
    }
  };

  const onPickFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      setIngestFiles([]);
      return;
    }

    setError('');

    await parseFilesForIngest(Array.from(files));
  };

  const onDropFiles = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDraggingFiles(false);

    const droppedFiles = Array.from(event.dataTransfer.files).filter((file) =>
      file.name.toLowerCase().endsWith('.json'),
    );
    if (droppedFiles.length === 0) {
      notify.error('Arrastra archivos JSON validos');
      return;
    }

    setError('');
    await parseFilesForIngest(droppedFiles);
  };

  const onDragOverFiles = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDraggingFiles(true);
  };

  const onDragLeaveFiles = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDraggingFiles(false);
  };

  const onIngest = async () => {
    if (!projectId || ingestFiles.length === 0) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await apiRequest<IngestResponse>(`/projects/${projectId}/translation-files/ingest`, {
        method: 'POST',
        auth: true,
        body: { files: ingestFiles },
      });

      notify.success(`Se cargaron ${response.filesIngested} archivo(s) en ${response.fileGroupsAffected} grupo(s)`);
      setIngestFiles([]);
      await load();
    } catch {
      const message = 'No se pudieron cargar los archivos';
      setError(message);
      notify.error(message);
    } finally {
      setLoading(false);
    }
  };

  const removeTranslationFile = async () => {
    if (!projectId) return;
    if (!fileToDelete) return;

    try {
      await apiRequest(`/projects/${projectId}/translation-files/${fileToDelete.id}`, {
        method: 'DELETE',
        auth: true,
      });
      notify.success('Archivo eliminado');
      setFileToDelete(null);
      await load();
    } catch {
      notify.error('No se pudo eliminar el archivo');
    }
  };

  const runAnalysis = async () => {
    if (!projectId) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await apiRequest<RunAnalysisResponse>(`/projects/${projectId}/analysis/run`, {
        method: 'POST',
        auth: true,
        body: {},
      });

      if (result.reports.length === 0) {
        setAnalysisReport(null);
        notify.info('El analisis no genero reportes');
        return;
      }

      const latestReportId = result.reports[0].id;
      const report = await apiRequest<AnalysisReport>(`/projects/${projectId}/analysis/reports/${latestReportId}`, {
        auth: true,
      });

      setAnalysisReport(report);
      setIssueTypeFilter('ALL');
      setIssueLanguageFilter('ALL');
      setExpandedIssueId(null);
      notify.success(`Analisis completado: ${result.issuesCreated} issue(s) en ${result.reportsCreated} reporte(s)`);
    } catch {
      const message = 'No se pudo ejecutar el analisis';
      setError(message);
      notify.error(message);
    } finally {
      setLoading(false);
    }
  };

  const issueTypeLabel = (type: IssueType) => {
    if (type === 'MISSING_KEY') return 'Falta clave';
    if (type === 'UNUSED_KEY') return 'Clave no usada';
    return 'Interpolacion distinta';
  };

  const issueTypeSeverity = (type: IssueType) => {
    if (type === 'MISSING_KEY') return 0;
    if (type === 'INTERPOLATION_MISMATCH') return 1;
    return 2;
  };

  const languageNameById = new Map(languages.map((language) => [language.id, language]));

  const issueTypeStats = {
    MISSING_KEY: (analysisReport?.issues ?? []).filter((issue) => issue.type === 'MISSING_KEY').length,
    UNUSED_KEY: (analysisReport?.issues ?? []).filter((issue) => issue.type === 'UNUSED_KEY').length,
    INTERPOLATION_MISMATCH: (analysisReport?.issues ?? []).filter((issue) => issue.type === 'INTERPOLATION_MISMATCH')
      .length,
  };

  const filteredIssues = (analysisReport?.issues ?? []).filter((issue) => {
    const typeMatch = issueTypeFilter === 'ALL' || issue.type === issueTypeFilter;
    const languageMatch = issueLanguageFilter === 'ALL' || issue.languageId === issueLanguageFilter;
    return typeMatch && languageMatch;
  });

  const sortedFilteredIssues = [...filteredIssues].sort((a, b) => {
    const severityDiff = issueTypeSeverity(a.type) - issueTypeSeverity(b.type);
    if (severityDiff !== 0) {
      return severityDiff;
    }

    const typeDiff = issueTypeLabel(a.type).localeCompare(issueTypeLabel(b.type), 'es');
    if (typeDiff !== 0) {
      return typeDiff;
    }

    return a.key.localeCompare(b.key, 'es');
  });

  const formatIssueDetails = (details: AnalysisReport['issues'][number]['details']) => {
    if (!details) {
      return 'Sin detalles adicionales';
    }

    return Object.entries(details)
      .map(([key, value]) => {
        if (Array.isArray(value)) {
          return `${key}: ${value.join(', ')}`;
        }

        if (typeof value === 'object' && value !== null) {
          return `${key}: ${JSON.stringify(value)}`;
        }

        return `${key}: ${String(value)}`;
      })
      .join(' | ');
  };

  const exportIssuesCsv = () => {
    if (sortedFilteredIssues.length === 0) {
      notify.error('No hay issues para exportar con los filtros actuales');
      return;
    }

    const rows = [
      ['clave', 'tipo', 'idioma', 'codigo', 'detalles'],
      ...sortedFilteredIssues.map((issue) => {
        const language = languageNameById.get(issue.languageId);
        return [
          issue.key,
          issueTypeLabel(issue.type),
          language?.name ?? issue.languageId,
          language?.code ?? '-',
          formatIssueDetails(issue.details),
        ];
      }),
    ];

    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const reportName = analysisReport?.fileGroup?.name ?? 'reporte';
    link.href = url;
    link.download = `issues_${reportName}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    notify.success(`CSV exportado: ${link.download}`);
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6">
      <PageHeader
        title={project ? project.name : 'Proyecto'}
        subtitle="Gestion de idiomas y carga inicial de traducciones"
      />

      {error ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}

      <section className="mt-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm md:p-6">
        <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-600">
          <span className="rounded-full border border-zinc-300 bg-zinc-100 px-2 py-1">
            Patron: {project ? PATTERN_LABELS[project.i18nPattern] : '-'}
          </span>
          <span className="rounded-full border border-zinc-300 bg-zinc-100 px-2 py-1">
            Idioma referencia:{' '}
            {project?.referenceLanguageId
              ? `${languageNameById.get(project.referenceLanguageId)?.name ?? 'Configurado'}`
              : 'Sin definir'}
          </span>
          <span className="rounded-full border border-zinc-300 bg-zinc-100 px-2 py-1">
            Archivos: {translationFiles.length}
          </span>
          <span className="rounded-full border border-zinc-300 bg-zinc-100 px-2 py-1">
            Issues actuales: {analysisReport?.issues.length ?? 0}
          </span>
        </div>

        <div className="mt-6 border-t border-zinc-200 pt-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
            <Languages size={16} />
            Idiomas
          </h2>

          <form className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_auto]" onSubmit={onAddLanguage}>
            <div>
              <label className="mb-1 block text-sm text-zinc-600">Codigo</label>
              <Input placeholder="en" value={code} onChange={(event) => setCode(event.target.value)} required />
            </div>

            <div>
              <label className="mb-1 block text-sm text-zinc-600">Nombre</label>
              <Input placeholder="Espanol" value={name} onChange={(event) => setName(event.target.value)} required />
            </div>

            <div className="md:self-end">
              <Button type="submit" disabled={loading} className="w-full md:w-auto">
                {loading ? 'Anadiendo...' : 'Anadir idioma'}
              </Button>
            </div>
          </form>

          {languages.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-500">No hay idiomas configurados.</p>
          ) : (
            <ul className="mt-3 divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
              {languages.map((language) => {
                const isReference = language.id === project?.referenceLanguageId;

                return (
                  <li key={language.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-3">
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">{language.name}</p>
                      <p className="text-xs text-zinc-500">{language.code}</p>
                    </div>

                    {isReference ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                        <Star size={12} className="fill-emerald-500 text-emerald-500" />
                        Referencia
                      </span>
                    ) : (
                      <Button type="button" variant="outline" size="sm" onClick={() => setReference(language.id)}>
                        <Star size={14} className="mr-1" />
                        Marcar referencia
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="mt-6 border-t border-zinc-200 pt-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
            <FileUp size={16} />
            Carga de traducciones
          </h2>

          <div
            className={`mt-3 rounded-xl border-2 border-dashed p-5 transition-colors ${
              isDraggingFiles ? 'border-zinc-700 bg-zinc-50' : 'border-zinc-300 bg-zinc-50/40'
            }`}
            onDrop={onDropFiles}
            onDragOver={onDragOverFiles}
            onDragLeave={onDragLeaveFiles}
          >
            <p className="text-sm font-medium text-zinc-800">Arrastra archivos JSON aqui</p>
            <p className="mt-1 text-xs text-zinc-600">
              Tambien puedes seleccionar archivos o una carpeta desde Finder.
            </p>
            <Input
              className="mt-3 block bg-white"
              type="file"
              accept=".json,application/json"
              multiple
              onChange={onPickFiles}
              // @ts-expect-error - this attribute is supported by Chromium browsers.
              webkitdirectory=""
            />
          </div>

          {ingestFiles.length > 0 ? (
            <ul className="mt-3 max-h-52 divide-y divide-zinc-200 overflow-auto rounded-lg border border-zinc-200 bg-white">
              {ingestFiles.map((file) => (
                <li key={file.path} className="px-3 py-2 text-sm text-zinc-700">
                  {file.path}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-zinc-500">Todavia no has seleccionado archivos.</p>
          )}

          <div className="mt-3">
            <Button type="button" onClick={onIngest} disabled={loading || ingestFiles.length === 0}>
              {loading ? 'Cargando...' : 'Cargar archivos'}
            </Button>
          </div>

          <h3 className="mt-6 text-sm font-semibold text-zinc-900">Archivos ya cargados</h3>

          {translationFiles.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-500">No hay archivos cargados en el proyecto.</p>
          ) : (
            <ul className="mt-3 divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
              {translationFiles.map((file) => (
                <li key={file.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-3">
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">{file.filename}</p>
                    <p className="text-xs text-zinc-500">
                      Grupo: {file.fileGroup.name} · {file.language.name} ({file.language.code})
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-red-300 text-red-800 hover:bg-red-100 hover:text-red-900"
                    onClick={() => setFileToDelete(file)}
                  >
                    <Trash2 size={14} className="mr-1" />
                    Eliminar
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-6 border-t border-zinc-200 pt-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
            <FileSearch size={16} />
            Analisis de archivos
          </h2>

          <p className="mt-2 text-sm text-zinc-600">
            Ejecuta una comparacion contra el idioma de referencia para detectar claves faltantes, no usadas e
            interpolaciones inconsistentes.
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" onClick={runAnalysis} disabled={loading}>
              {loading ? 'Analizando...' : 'Ejecutar analisis'}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={exportIssuesCsv}
              disabled={!analysisReport || sortedFilteredIssues.length === 0}
            >
              Exportar CSV (filtrado)
            </Button>
          </div>

          {analysisReport ? (
            <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
              <h3 className="text-sm font-semibold text-zinc-900">Resultado del ultimo reporte</h3>

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm text-zinc-600">Tipo de issue</label>
                  <Select
                    value={issueTypeFilter}
                    onChange={(event) => setIssueTypeFilter(event.target.value as 'ALL' | IssueType)}
                  >
                    <option value="ALL">Todos</option>
                    <option value="MISSING_KEY">Falta clave</option>
                    <option value="UNUSED_KEY">Clave no usada</option>
                    <option value="INTERPOLATION_MISMATCH">Interpolacion distinta</option>
                  </Select>
                </div>

                <div>
                  <label className="mb-1 block text-sm text-zinc-600">Idioma</label>
                  <Select value={issueLanguageFilter} onChange={(event) => setIssueLanguageFilter(event.target.value)}>
                    <option value="ALL">Todos</option>
                    {languages.map((language) => (
                      <option key={language.id} value={language.id}>
                        {language.name} ({language.code})
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-700">
                  Falta clave: {issueTypeStats.MISSING_KEY}
                </span>
                <span className="rounded-full border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-700">
                  No usada: {issueTypeStats.UNUSED_KEY}
                </span>
                <span className="rounded-full border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-700">
                  Interpolacion: {issueTypeStats.INTERPOLATION_MISMATCH}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIssueTypeFilter('ALL');
                    setIssueLanguageFilter('ALL');
                  }}
                >
                  Limpiar filtros
                </Button>
              </div>

              {analysisReport.issues.length > 0 ? (
                <p className="mt-3 text-sm text-zinc-600">
                  Mostrando {sortedFilteredIssues.length} de {analysisReport.issues.length} issue(s)
                </p>
              ) : null}

              {sortedFilteredIssues.length === 0 ? (
                <p className="mt-3 text-sm text-zinc-500">No se encontraron issues.</p>
              ) : (
                <ul className="mt-3 divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
                  {sortedFilteredIssues.map((issue) => {
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
                          <span className="rounded-full border border-zinc-300 bg-zinc-100 px-2 py-1 text-xs text-zinc-700">
                            {issue.type}
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setExpandedIssueId(isExpanded ? null : issue.id)}
                          >
                            {isExpanded ? 'Ocultar' : 'Ver detalle'}
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ) : (
            <p className="mt-3 text-sm text-zinc-500">Aun no hay un reporte cargado.</p>
          )}

          {!project?.referenceLanguageId ? (
            <p className="mt-3 flex items-center gap-2 text-sm text-red-700">
              <AlertTriangle size={14} />
              Debes marcar un idioma de referencia antes de ejecutar el analisis.
            </p>
          ) : null}
        </div>
      </section>

      <AlertDialog open={Boolean(fileToDelete)} onOpenChange={(open) => !open && setFileToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar archivo</AlertDialogTitle>
            <AlertDialogDescription>
              {`Vas a eliminar "${fileToDelete?.filename ?? ''}" (${fileToDelete?.language.code ?? ''}). Esta accion no se puede deshacer.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={removeTranslationFile}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
