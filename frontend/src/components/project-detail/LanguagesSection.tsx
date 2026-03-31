import { Languages, Pencil, Star, Trash2 } from 'lucide-react';
import type { FormEvent } from 'react';
import type { Language } from '../../lib/types';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

type LanguagesSectionProps = {
  languages: Language[];
  referenceLanguageId?: string | null;
  code: string;
  name: string;
  loading: boolean;
  onCodeChange: (value: string) => void;
  onNameChange: (value: string) => void;
  onAddLanguage: (event: FormEvent) => void | Promise<void>;
  onSetReference: (languageId: string) => void | Promise<void>;
  onEditLanguage: (language: Language) => void;
  onDeleteLanguage: (language: Language) => void;
};

export function LanguagesSection({
  languages,
  referenceLanguageId,
  code,
  name,
  loading,
  onCodeChange,
  onNameChange,
  onAddLanguage,
  onSetReference,
  onEditLanguage,
  onDeleteLanguage,
}: LanguagesSectionProps) {
  return (
    <div className="mt-2">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
        <Languages size={16} />
        Idiomas
      </h2>

      <form className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_auto]" onSubmit={onAddLanguage}>
        <div>
          <label className="mb-1 block text-sm text-zinc-600">Codigo</label>
          <Input placeholder="en" value={code} onChange={(event) => onCodeChange(event.target.value)} required />
        </div>

        <div>
          <label className="mb-1 block text-sm text-zinc-600">Nombre</label>
          <Input placeholder="Espanol" value={name} onChange={(event) => onNameChange(event.target.value)} required />
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
            const isReference = language.id === referenceLanguageId;

            return (
              <li key={language.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-3">
                <div>
                  <p className="text-sm font-semibold text-zinc-900">{language.name}</p>
                  <p className="text-xs text-zinc-500">{language.code}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {isReference ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                      <Star size={12} className="fill-emerald-500 text-emerald-500" />
                      Referencia
                    </span>
                  ) : (
                    <Button type="button" variant="outline" size="sm" onClick={() => void onSetReference(language.id)}>
                      <Star size={14} className="mr-1" />
                      Marcar referencia
                    </Button>
                  )}

                  <Button type="button" variant="outline" size="sm" onClick={() => onEditLanguage(language)}>
                    <Pencil size={14} className="mr-1" />
                    Editar
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-red-300 text-red-800 hover:bg-red-100 hover:text-red-900"
                    onClick={() => onDeleteLanguage(language)}
                  >
                    <Trash2 size={14} className="mr-1" />
                    Eliminar
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
