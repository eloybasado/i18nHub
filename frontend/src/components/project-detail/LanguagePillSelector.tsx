import type { Language } from '../../lib/types';

type LanguagePillSelectorProps = {
  languages: Language[];
  allSelected: boolean;
  isSelected: (code: string) => boolean;
  onToggleAll: () => void;
  onToggleLanguage: (code: string) => void;
};

export function LanguagePillSelector({
  languages,
  allSelected,
  isSelected,
  onToggleAll,
  onToggleLanguage,
}: LanguagePillSelectorProps) {
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      <button
        type="button"
        className={`rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors ${
          allSelected
            ? 'border-zinc-900 bg-zinc-900 text-white'
            : 'border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-100'
        }`}
        onClick={onToggleAll}
      >
        All
      </button>

      {languages.map((language) => {
        const selected = isSelected(language.code);

        return (
          <button
            type="button"
            key={language.id}
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${
              selected
                ? 'border-zinc-900 bg-zinc-900 text-white'
                : 'border-zinc-300 bg-white text-zinc-600 hover:bg-zinc-100'
            }`}
            onClick={() => onToggleLanguage(language.code)}
          >
            {language.code}
          </button>
        );
      })}
    </div>
  );
}
