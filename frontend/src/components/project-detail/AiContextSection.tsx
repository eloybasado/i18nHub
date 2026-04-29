import { Bot, Star } from 'lucide-react';
import { useState } from 'react';
import type { AiGlossaryEntry, Language } from '../../lib/types';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { GlossaryTermRow } from './GlossaryTermRow';

type AiContextSectionProps = {
  aiContext: string;
  contextSaving?: boolean;
  onAiContextChange: (value: string) => void;
  languages: Language[];
  glossaryEntries: AiGlossaryEntry[];
  onAddGlossaryEntry: (entry: Omit<AiGlossaryEntry, 'id'>) => void;
  onUpdateGlossaryEntry: (id: string, patch: Partial<Omit<AiGlossaryEntry, 'id'>>) => void;
  onRemoveGlossaryEntry: (id: string) => void;
  isPro?: boolean;
};

export function AiContextSection({
  aiContext,
  contextSaving = false,
  onAiContextChange,
  languages,
  glossaryEntries,
  onAddGlossaryEntry,
  onUpdateGlossaryEntry,
  onRemoveGlossaryEntry,
  isPro = true,
}: AiContextSectionProps) {
  const [sourceTerm, setSourceTerm] = useState('');
  const [targetTerm, setTargetTerm] = useState('');

  const addGlossaryEntry = () => {
    if (!sourceTerm.trim() || !targetTerm.trim()) {
      return;
    }

    onAddGlossaryEntry({
      sourceTerm: sourceTerm.trim(),
      targetTerm: targetTerm.trim(),
      languageCodes: [],
    });

    setSourceTerm('');
    setTargetTerm('');
  };

  return (
    <div className="mt-2">
      <h2 className="flex items-center gap-2 text-base font-semibold text-zinc-900">
        <Bot size={16} />
        Contexto IA
        {!isPro && (
          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
            PRO
          </span>
        )}
      </h2>

      {!isPro && (
        <div className="mt-3 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <Star size={18} className="mt-0.5 shrink-0 text-amber-500" />
          <div>
            <p className="text-sm font-semibold text-amber-900">Función exclusiva de cuentas PRO</p>
            <p className="mt-1 text-sm text-amber-800">
              El contexto de IA y el diccionario de términos permiten obtener sugerencias más precisas y
              coherentes con el estilo de tu proyecto. Disponibles al activar una cuenta PRO.
            </p>
          </div>
        </div>
      )}

      <p className="mt-2 text-base text-zinc-600">
        Añade contexto global del proyecto para que las sugerencias de IA sean más precisas.
      </p>

      {isPro && (
        <p className="mt-1 text-xs text-zinc-500">
          {contextSaving ? 'Guardando contexto IA...' : 'Contexto IA guardado automáticamente.'}
        </p>
      )}

      <div className={!isPro ? 'pointer-events-none select-none opacity-40' : ''}>
        <div className="mt-4 rounded-lg border border-zinc-200 bg-white p-4">
          <label className="block text-sm font-semibold text-zinc-900">Instrucciones para traducción</label>
          <p className="mt-1 text-sm text-zinc-600">Define tono, audiencia, terminología y restricciones de estilo.</p>
          <textarea
            className="mt-3 min-h-[180px] w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500"
            placeholder="Ej: Producto fintech para España, tono cercano y profesional, usar 'usted', mantener términos técnicos en inglés cuando sean estándares"
            value={aiContext}
            onChange={(event) => onAiContextChange(event.target.value)}
            disabled={!isPro}
          />
        </div>

        <div className="mt-4 rounded-lg border border-zinc-200 bg-white p-4">
          <label className="block text-sm font-semibold text-zinc-900">Diccionario</label>
          <p className="mt-1 text-sm text-zinc-600">
            Define conceptos con traducción fija para todos los idiomas o solo algunos.
          </p>

          <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                Concepto origen
              </label>
              <Input
                placeholder="Ej: Book Hunter"
                value={sourceTerm}
                onChange={(event) => setSourceTerm(event.target.value)}
                disabled={!isPro}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-zinc-500">
                Traducción fija
              </label>
              <Input
                placeholder="Ej: Book Hunter"
                value={targetTerm}
                onChange={(event) => setTargetTerm(event.target.value)}
                disabled={!isPro}
              />
            </div>
            <Button
              type="button"
              onClick={addGlossaryEntry}
              disabled={!isPro || !sourceTerm.trim() || !targetTerm.trim()}
            >
              Añadir término
            </Button>
          </div>

          {glossaryEntries.length > 0 ? (
            <ul className="mt-4 divide-y divide-zinc-200 rounded-md border border-zinc-200 bg-white">
              {glossaryEntries.map((entry) => (
                <GlossaryTermRow
                  key={entry.id}
                  entry={entry}
                  languages={languages}
                  onUpdateGlossaryEntry={onUpdateGlossaryEntry}
                  onRemoveGlossaryEntry={onRemoveGlossaryEntry}
                />
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-zinc-500">No hay términos definidos todavía.</p>
          )}
        </div>
      </div>
    </div>
  );
}
