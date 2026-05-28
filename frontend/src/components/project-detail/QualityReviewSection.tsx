import { Loader2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { apiRequest } from '../../lib/api';
import { notify } from '../../lib/toast';
import type { Language, QualityReviewResponse, QualityReviewResult, TranslationFileSummary } from '../../lib/types';
import { AiLoadingOverlay } from '../common/AiLoadingOverlay';
import { Button } from '../ui/button';
import { Select } from '../ui/select';

type QualityReviewState = {
  selectedLanguageCode: string;
  fileId: string;
  results: QualityReviewResult[];
  selectedSuggestions: Record<string, boolean>;
  confidenceFilter: 'ALL' | 'high' | 'medium' | 'low';
};

type QualityReviewSectionProps = {
  projectId: string;
  translationFiles: TranslationFileSummary[];
  languages: Language[];
  referenceLanguageId?: string | null;
};

const applyUpdatesToContent = (
  content: Record<string, unknown>,
  updates: Record<string, string>,
): Record<string, unknown> => {
  const result = JSON.parse(JSON.stringify(content)); // Deep clone

  for (const [keyPath, newValue] of Object.entries(updates)) {
    const parts = keyPath.split('.');
    let current: unknown = result;

    // Navigate to parent
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (typeof current !== 'object' || current === null || !(part in (current as Record<string, unknown>))) {
        (current as Record<string, unknown>)[part] = {};
      }
      current = (current as Record<string, unknown>)[part];
    }

    // Set the value
    const lastPart = parts[parts.length - 1];
    if (typeof current === 'object' && current !== null) {
      (current as Record<string, unknown>)[lastPart] = newValue;
    }
  }

  return result;
};

export function QualityReviewSection({
  projectId,
  translationFiles,
  languages,
  referenceLanguageId,
}: QualityReviewSectionProps) {
  const [state, setState] = useState<QualityReviewState>({
    selectedLanguageCode: '',
    fileId: '',
    results: [],
    selectedSuggestions: {},
    confidenceFilter: 'ALL',
  });

  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);

  const nonReferenceFiles = useMemo(() => {
    return translationFiles.filter((f) => f.language.id !== referenceLanguageId);
  }, [translationFiles, referenceLanguageId]);

  const nonReferenceLanguages = useMemo(() => {
    return languages.filter((l) => l.id !== referenceLanguageId);
  }, [languages, referenceLanguageId]);

  const filesForSelectedLanguage = useMemo(() => {
    if (!state.selectedLanguageCode) {
      return [];
    }
    return nonReferenceFiles.filter((f) => f.language.code === state.selectedLanguageCode);
  }, [nonReferenceFiles, state.selectedLanguageCode]);

  const selectedSuggestionsCount = useMemo(() => {
    return Object.values(state.selectedSuggestions).filter(Boolean).length;
  }, [state.selectedSuggestions]);

  const filteredSuggestions = useMemo(() => {
    if (state.confidenceFilter === 'ALL') {
      return state.results;
    }
    return state.results.map((result) => ({
      ...result,
      suggestions: result.suggestions.filter((s) => s.confidence === state.confidenceFilter),
    }));
  }, [state.results, state.confidenceFilter]);

  const canRunReview = state.selectedLanguageCode && state.fileId;

  const handleLanguageChange = (languageCode: string) => {
    setState((prev) => ({
      ...prev,
      selectedLanguageCode: languageCode,
      fileId: '', // Reset file when language changes
      results: [],
      selectedSuggestions: {},
      confidenceFilter: 'ALL',
    }));
  };

  const handleFileChange = (fileId: string) => {
    setState((prev) => ({
      ...prev,
      fileId,
      results: [],
      selectedSuggestions: {},
      confidenceFilter: 'ALL',
    }));
  };

  const runReview = async () => {
    if (!canRunReview) {
      notify.error('Selecciona un idioma y un archivo');
      return;
    }

    setLoading(true);
    try {
      const data = (await apiRequest(`/projects/${projectId}/ai/review`, {
        method: 'POST',
        auth: true,
        body: {
          translationFileId: state.fileId,
          targetLanguageCodes: [state.selectedLanguageCode],
        },
      })) as QualityReviewResponse;

      setState((prev) => ({
        ...prev,
        results: data.results,
        selectedSuggestions: {},
        confidenceFilter: 'ALL',
      }));

      const totalSuggestions = data.results.reduce((sum, r) => sum + r.suggestions.length, 0);
      notify.success(`Se encontraron ${totalSuggestions} sugerencias de calidad`);
    } catch (error) {
      notify.error('Error al revisar calidad');
      console.error('Quality review error:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSuggestionSelection = (suggestionId: string) => {
    setState((prev) => ({
      ...prev,
      selectedSuggestions: {
        ...prev.selectedSuggestions,
        [suggestionId]: !prev.selectedSuggestions[suggestionId],
      },
    }));
  };

  const applySuggestions = async () => {
    const selectedIds = Object.entries(state.selectedSuggestions)
      .filter(([, selected]) => selected)
      .map(([id]) => id);

    if (selectedIds.length === 0) {
      notify.error('Selecciona al menos una sugerencia para aplicar');
      return;
    }

    setApplying(true);
    try {
      // Build updates: map from fileId to updates per key
      const updatesByFileId: Record<string, Record<string, string>> = {};

      state.results.forEach((result) => {
        result.suggestions.forEach((suggestion, idx) => {
          const suggestionId = `${result.fileId}-${result.languageCode}-${idx}`;
          if (selectedIds.includes(suggestionId)) {
            if (!updatesByFileId[result.fileId]) {
              updatesByFileId[result.fileId] = {};
            }
            updatesByFileId[result.fileId][suggestion.key] = suggestion.suggestedText;
          }
        });
      });

      // Apply updates to each file
      let appliedCount = 0;
      for (const [fileId, updates] of Object.entries(updatesByFileId)) {
        try {
          const fileData = (await apiRequest(`/translation-files/${fileId}`, {
            auth: true,
          })) as {
            content: Record<string, unknown>;
          };
          const updatedContent = applyUpdatesToContent(fileData.content || {}, updates);

          await apiRequest(`/translation-files/${fileId}`, {
            method: 'PATCH',
            auth: true,
            body: { content: updatedContent },
          });

          appliedCount += Object.keys(updates).length;
        } catch (error) {
          notify.error(`Error al guardar ${fileId}`);
          console.error('Error applying to file:', error);
        }
      }

      notify.success(`Se aplicaron ${appliedCount} cambios de calidad`);
      setState((prev) => ({
        ...prev,
        results: [],
        selectedSuggestions: {},
      }));
    } catch (error) {
      notify.error('Error al guardar cambios');
      console.error('Apply suggestions error:', error);
    } finally {
      setApplying(false);
    }
  };

  return (
    <div>
      <AiLoadingOverlay visible={loading} />
      <div className="mb-6 flex items-center gap-2">
        <h2 className="text-lg font-semibold text-zinc-900">Revision de Calidad</h2>
        <span className="rounded-full border border-purple-300 bg-purple-50 px-2 py-0.5 text-[11px] font-semibold text-purple-700">
          BETA
        </span>
      </div>

      <p className="mb-6 text-sm text-zinc-600">
        La IA revisar tus traducciones en busca de errores, frases poco naturales y problemas de calidad. Las
        sugerencias se muestran archivo por archivo para permitirte revisar y aplicar solo las que consideres adecuadas.
      </p>

      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-700">Idioma a revisar</label>
          {nonReferenceLanguages.length === 0 ? (
            <p className="text-xs text-zinc-500">No hay idiomas no-referencia disponibles</p>
          ) : (
            <div className="mt-1 flex flex-wrap gap-1">
              {nonReferenceLanguages.map((lang) => {
                const isSelected = state.selectedLanguageCode === lang.code;
                return (
                  <button
                    key={lang.id}
                    type="button"
                    disabled={loading}
                    onClick={() => handleLanguageChange(lang.code)}
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors ${
                      isSelected
                        ? 'border-zinc-900 bg-zinc-900 text-white'
                        : 'border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-100 disabled:opacity-50'
                    }`}
                  >
                    {lang.name} ({lang.code})
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-700">Archivo a revisar</label>
          <Select
            value={state.fileId}
            onChange={(e) => handleFileChange(e.target.value)}
            disabled={loading || !state.selectedLanguageCode}
          >
            <option value="">-- Selecciona un archivo --</option>
            {filesForSelectedLanguage.map((file) => (
              <option key={file.id} value={file.id}>
                {file.filename}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex gap-2 pt-2">
          <Button onClick={runReview} disabled={!canRunReview || loading} className="gap-2">
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Revisando...
              </>
            ) : (
              'Ejecutar Revision'
            )}
          </Button>
        </div>
      </div>

      {state.results.length > 0 && (
        <div className="mt-6 space-y-4 border-t border-zinc-200 pt-6">
          <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <h3 className="text-sm font-semibold text-zinc-900">Resultados</h3>
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-zinc-600">Filtrar por calidad:</label>
              <Select
                value={state.confidenceFilter}
                onChange={(e) =>
                  setState((prev) => ({
                    ...prev,
                    confidenceFilter: e.target.value as 'ALL' | 'high' | 'medium' | 'low',
                  }))
                }
                containerClassName="max-w-xs"
              >
                <option value="ALL">Todas</option>
                <option value="high">Alta confianza</option>
                <option value="medium">Confianza media</option>
                <option value="low">Baja confianza</option>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            {filteredSuggestions.map((result) => (
              <div
                key={`${result.fileId}-${result.languageCode}`}
                className="rounded-lg border border-zinc-200 bg-white p-3"
              >
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-mono text-zinc-500">{result.filename}</p>
                    <p className="text-sm font-medium text-zinc-900">
                      {result.languageName} ({result.languageCode})
                    </p>
                  </div>
                  <span className="text-xs text-zinc-600">
                    {result.suggestions.length} sugerencia{result.suggestions.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {result.suggestions.length > 0 && (
                  <div className="mt-2 space-y-2 border-t border-zinc-100 pt-2">
                    {result.suggestions.map((suggestion, idx) => {
                      const suggestionId = `${result.fileId}-${result.languageCode}-${idx}`;
                      const isSelected = state.selectedSuggestions[suggestionId];

                      return (
                        <div key={suggestionId} className="flex gap-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSuggestionSelection(suggestionId)}
                            disabled={applying}
                            className="mt-1 h-4 w-4 cursor-pointer rounded border-zinc-300 accent-zinc-900"
                          />
                          <div className="flex-1 space-y-1">
                            <p className="text-xs font-mono text-zinc-500">{suggestion.key}</p>
                            <div className="text-xs">
                              <span className="font-medium text-zinc-900">{suggestion.currentText}</span>
                              <span className="text-zinc-500"> → </span>
                              <span className="font-medium text-green-700">{suggestion.suggestedText}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <p className="text-xs text-zinc-600">{suggestion.reason}</p>
                              <span
                                className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                                  suggestion.confidence === 'high'
                                    ? 'bg-green-100 text-green-700'
                                    : suggestion.confidence === 'medium'
                                      ? 'bg-yellow-100 text-yellow-700'
                                      : 'bg-zinc-100 text-zinc-700'
                                }`}
                              >
                                {suggestion.confidence === 'high'
                                  ? 'Alta'
                                  : suggestion.confidence === 'medium'
                                    ? 'Media'
                                    : 'Baja'}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>

          {selectedSuggestionsCount > 0 && (
            <Button onClick={applySuggestions} disabled={applying} className="w-full gap-2">
              {applying ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Aplicando...
                </>
              ) : (
                `Aplicar ${selectedSuggestionsCount} sugerencia${selectedSuggestionsCount !== 1 ? 's' : ''}`
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
