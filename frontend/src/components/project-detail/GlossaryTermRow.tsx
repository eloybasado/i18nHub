import { Pencil, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import type { AiGlossaryEntry, Language } from '../../lib/types';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { LanguagePillSelector } from './LanguagePillSelector';

type GlossaryTermRowProps = {
  entry: AiGlossaryEntry;
  languages: Language[];
  onUpdateGlossaryEntry: (id: string, patch: Partial<Omit<AiGlossaryEntry, 'id'>>) => void;
  onRemoveGlossaryEntry: (id: string) => void;
};

export function GlossaryTermRow({
  entry,
  languages,
  onUpdateGlossaryEntry,
  onRemoveGlossaryEntry,
}: GlossaryTermRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editingSourceTerm, setEditingSourceTerm] = useState(entry.sourceTerm);
  const [editingTargetTerm, setEditingTargetTerm] = useState(entry.targetTerm);

  const toggleEntryLanguage = (code: string) => {
    const allLanguageCodes = languages.map((language) => language.code);

    if (entry.languageCodes.length === 0) {
      onUpdateGlossaryEntry(entry.id, {
        languageCodes: allLanguageCodes.filter((languageCode) => languageCode !== code),
      });
      return;
    }

    const nextLanguageCodes = entry.languageCodes.includes(code)
      ? entry.languageCodes.filter((item) => item !== code)
      : [...entry.languageCodes, code];

    if (nextLanguageCodes.length === 0 || nextLanguageCodes.length === allLanguageCodes.length) {
      onUpdateGlossaryEntry(entry.id, {
        languageCodes: [],
      });
      return;
    }

    onUpdateGlossaryEntry(entry.id, {
      languageCodes: nextLanguageCodes,
    });
  };

  const toggleAllLanguages = () => {
    onUpdateGlossaryEntry(entry.id, {
      languageCodes: [],
    });
  };

  const startEditing = () => {
    setEditingSourceTerm(entry.sourceTerm);
    setEditingTargetTerm(entry.targetTerm);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setEditingSourceTerm(entry.sourceTerm);
    setEditingTargetTerm(entry.targetTerm);
    setIsEditing(false);
  };

  const saveEditing = () => {
    if (!editingSourceTerm.trim() || !editingTargetTerm.trim()) {
      return;
    }

    onUpdateGlossaryEntry(entry.id, {
      sourceTerm: editingSourceTerm.trim(),
      targetTerm: editingTargetTerm.trim(),
    });
    setIsEditing(false);
  };

  return (
    <li className="px-3 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          {isEditing ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <Input value={editingSourceTerm} onChange={(event) => setEditingSourceTerm(event.target.value)} />
              <Input value={editingTargetTerm} onChange={(event) => setEditingTargetTerm(event.target.value)} />
            </div>
          ) : (
            <p className="text-sm text-zinc-900">
              <span className="font-semibold">{entry.sourceTerm}</span>
              {' -> '}
              <span className="font-semibold">{entry.targetTerm}</span>
            </p>
          )}

          <LanguagePillSelector
            languages={languages}
            allSelected={entry.languageCodes.length === 0}
            isSelected={(code) => entry.languageCodes.length === 0 || entry.languageCodes.includes(code)}
            onToggleAll={toggleAllLanguages}
            onToggleLanguage={toggleEntryLanguage}
          />
        </div>

        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={saveEditing}
                disabled={!editingSourceTerm.trim() || !editingTargetTerm.trim()}
              >
                Guardar
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={cancelEditing}>
                <X size={14} className="mr-1" />
                Cancelar
              </Button>
            </>
          ) : (
            <>
              <Button type="button" size="sm" variant="outline" onClick={startEditing}>
                <Pencil size={14} className="mr-1" />
                Editar
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="border-red-300 text-red-800 hover:bg-red-100 hover:text-red-900"
                onClick={() => onRemoveGlossaryEntry(entry.id)}
              >
                <Trash2 size={14} className="mr-1" />
                Eliminar
              </Button>
            </>
          )}
        </div>
      </div>
    </li>
  );
}
