import { Copy, Languages, WandSparkles } from 'lucide-react';
import type { Language } from '../../lib/types';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import { Select } from '../ui/select';

type CloneMode = 'EMPTY_STRUCTURE' | 'COPY_CONTENT';

type CloneToLanguageWizardModalProps = {
  disabled: boolean;
  editorBusy: boolean;
  editorTargetLanguageId: string;
  editorTargetLanguageOptions: Language[];
  editorCloneMode: CloneMode;
  selectedTargetLanguage: Language | undefined;
  onTargetLanguageChange: (languageId: string) => void;
  onCloneModeChange: (mode: CloneMode) => void;
  onCloneEmptyStructure: () => void;
  onRequestCopyContent: () => void;
};

export function CloneToLanguageWizardModal({
  disabled,
  editorBusy,
  editorTargetLanguageId,
  editorTargetLanguageOptions,
  editorCloneMode,
  selectedTargetLanguage,
  onTargetLanguageChange,
  onCloneModeChange,
  onCloneEmptyStructure,
  onRequestCopyContent,
}: CloneToLanguageWizardModalProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" disabled={disabled} className="mt-3">
          <WandSparkles size={14} className="mr-1.5" />
          Crear/actualizar idioma con asistente
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Asistente de creación en otro idioma</DialogTitle>
          <DialogDescription>
            Selecciona idioma destino y cómo quieres preparar el archivo antes de ejecutarlo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
              <Languages size={15} />
              Paso 1: Idioma destino
            </p>
            <p className="mt-1 text-sm text-zinc-600">
              Elige el idioma donde quieres crear o actualizar el archivo equivalente.
            </p>
            <Select
              containerClassName="mt-2"
              value={editorTargetLanguageId}
              onChange={(event) => onTargetLanguageChange(event.target.value)}
              disabled={editorTargetLanguageOptions.length === 0 || editorBusy}
            >
              <option value="">Selecciona idioma destino</option>
              {editorTargetLanguageOptions.map((language) => (
                <option key={language.id} value={language.id}>
                  {language.name} ({language.code})
                </option>
              ))}
            </Select>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
              <Copy size={15} />
              Paso 2: Tipo de acción
            </p>
            <p className="mt-1 text-sm text-zinc-600">
              Decide si crear estructura vacía o copiar el contenido actual al idioma destino.
            </p>
            <Select
              containerClassName="mt-2"
              value={editorCloneMode}
              onChange={(event) => onCloneModeChange(event.target.value as CloneMode)}
              disabled={editorBusy}
            >
              <option value="EMPTY_STRUCTURE">Crear estructura vacía (seguro)</option>
              <option value="COPY_CONTENT">Copiar contenido actual (puede sobrescribir)</option>
            </Select>
            <p className="mt-2 text-xs text-zinc-600">
              {editorCloneMode === 'EMPTY_STRUCTURE'
                ? 'Genera las mismas claves con textos vacíos para traducir después.'
                : 'Replica las traducciones actuales en destino. Útil como base rápida, pero puede sobrescribir datos previos.'}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            disabled={editorBusy || !editorTargetLanguageId}
            onClick={() => {
              if (editorCloneMode === 'COPY_CONTENT') {
                onRequestCopyContent();
                return;
              }
              onCloneEmptyStructure();
            }}
          >
            {editorCloneMode === 'EMPTY_STRUCTURE'
              ? `Crear estructura${selectedTargetLanguage ? ` en ${selectedTargetLanguage.name}` : ''}`
              : `Copiar contenido${selectedTargetLanguage ? ` en ${selectedTargetLanguage.name}` : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
