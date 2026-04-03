import { Bot } from 'lucide-react';
import { useState } from 'react';
import type { AiGlossaryEntry, Language } from '../../lib/types';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { GlossaryTermRow } from './GlossaryTermRow';

type AiContextSectionProps = {
  aiContext: string;
  onAiContextChange: (value: string) => void;
  languages: Language[];
  glossaryEntries: AiGlossaryEntry[];
  onAddGlossaryEntry: (entry: Omit<AiGlossaryEntry, 'id'>) => void;
  onUpdateGlossaryEntry: (id: string, patch: Partial<Omit<AiGlossaryEntry, 'id'>>) => void;
  onRemoveGlossaryEntry: (id: string) => void;
};

export function AiContextSection({
  aiContext,
  onAiContextChange,
  languages,
  glossaryEntries,
  onAddGlossaryEntry,
  onUpdateGlossaryEntry,
  onRemoveGlossaryEntry,
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
      </h2>

      <p className="mt-2 text-base text-zinc-600">
        Añade contexto global del proyecto para que las sugerencias de IA sean más precisas.
      </p>

      <div className="mt-4 rounded-lg border border-zinc-200 bg-white p-4">
        <label className="block text-sm font-semibold text-zinc-900">Instrucciones para traducción</label>
        <p className="mt-1 text-sm text-zinc-600">Define tono, audiencia, terminología y restricciones de estilo.</p>
        <textarea
          className="mt-3 min-h-[180px] w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:border-zinc-500"
          placeholder="Ej: Producto fintech para España, tono cercano y profesional, usar 'usted', mantener términos técnicos en inglés cuando sean estándares"
          value={aiContext}
          onChange={(event) => onAiContextChange(event.target.value)}
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
            />
          </div>
          <Button type="button" onClick={addGlossaryEntry} disabled={!sourceTerm.trim() || !targetTerm.trim()}>
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
  );
}
