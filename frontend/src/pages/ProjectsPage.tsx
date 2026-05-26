import { Eye, FolderPlus, FolderTree, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { apiRequest } from '../lib/api';
import { notify } from '../lib/toast';
import type { I18nPattern, Project } from '../lib/types';

const PATTERNS: I18nPattern[] = ['SINGLE_FILE', 'FOLDER_PER_LOCALE', 'SUFFIX', 'PREFIX'];

const PATTERN_LABELS: Record<I18nPattern, string> = {
  SINGLE_FILE: 'Archivo unico por idioma',
  FOLDER_PER_LOCALE: 'Carpeta por idioma',
  SUFFIX: 'Sufijo (home_es.json)',
  PREFIX: 'Prefijo (es_home.json)',
};

const PATTERN_HELP: Record<I18nPattern, string> = {
  SINGLE_FILE: 'Un unico archivo por idioma, por ejemplo locales/es.json y locales/en.json.',
  FOLDER_PER_LOCALE: 'Una carpeta por idioma, por ejemplo locales/es/home.json y locales/en/home.json.',
  SUFFIX: 'El idioma va al final del nombre, por ejemplo home_es.json.',
  PREFIX: 'El idioma va al principio del nombre, por ejemplo es_home.json.',
};

const WIZARD_STEPS = [
  { id: 1, title: 'Datos basicos' },
  { id: 2, title: 'Patron i18n' },
  { id: 3, title: 'Revision' },
] as const;

type WizardStep = (typeof WIZARD_STEPS)[number]['id'];

export function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [i18nPattern, setI18nPattern] = useState<I18nPattern>('SINGLE_FILE');
  const [wizardStep, setWizardStep] = useState<WizardStep>(1);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadProjects = async () => {
    try {
      const data = await apiRequest<Project[]>('/projects', { auth: true });
      setProjects(data);
    } catch {
      const message = 'No se pudieron cargar los proyectos';
      setError(message);
      notify.error(message);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const onCreate = async () => {
    setError('');
    setLoading(true);

    try {
      await apiRequest<Project>('/projects', {
        method: 'POST',
        auth: true,
        body: {
          name,
          description: description || undefined,
          i18nPattern,
        },
      });

      setName('');
      setDescription('');
      setI18nPattern('SINGLE_FILE');
      setWizardStep(1);
      notify.success('Proyecto creado correctamente');
      await loadProjects();
    } catch {
      const message = 'No se pudo crear el proyecto';
      setError(message);
      notify.error(message);
    } finally {
      setLoading(false);
    }
  };

  const onDeleteProject = async () => {
    if (!projectToDelete) {
      return;
    }

    try {
      await apiRequest(`/projects/${projectToDelete.id}`, {
        method: 'DELETE',
        auth: true,
      });
      notify.success('Proyecto eliminado');
      setDeleteConfirmationText('');
      setProjectToDelete(null);
      await loadProjects();
    } catch {
      const message = 'No se pudo eliminar el proyecto';
      setError(message);
      notify.error(message);
    }
  };

  const confirmationPhrase = projectToDelete ? `eliminar ${projectToDelete.name}` : '';
  const isDeleteEnabled = deleteConfirmationText.trim() === confirmationPhrase;
  const isStepOneValid = name.trim().length >= 2;

  const onOpenDeleteDialog = (project: Project) => {
    setProjectToDelete(project);
    setDeleteConfirmationText('');
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6">
      <section className="py-1">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
          <FolderPlus size={16} className="text-zinc-700" />
          Nuevo proyecto
        </h2>

        <div className="mt-4">
          <ol className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-center gap-y-2">
            {WIZARD_STEPS.map((step, index) => {
              const isActive = wizardStep === step.id;
              const isDone = wizardStep > step.id;
              const isLast = index === WIZARD_STEPS.length - 1;
              const canJump = step.id <= wizardStep || (step.id === 2 && isStepOneValid) || wizardStep === 3;

              return (
                <li key={step.id} className="flex items-center">
                  <button
                    type="button"
                    disabled={!canJump || loading}
                    onClick={() => {
                      if (!canJump) return;
                      setWizardStep(step.id);
                    }}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm transition-colors ${
                      isDone
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                        : isActive
                          ? 'border-zinc-900 bg-zinc-900 text-white shadow-sm'
                          : 'border-zinc-200 bg-white text-zinc-600'
                    } ${canJump ? 'cursor-pointer hover:border-zinc-400' : 'cursor-not-allowed opacity-60'}`}
                  >
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                        isDone
                          ? 'bg-emerald-200 text-emerald-900'
                          : isActive
                            ? 'bg-white text-zinc-900'
                            : 'bg-zinc-100 text-zinc-500'
                      }`}
                    >
                      {step.id}
                    </span>
                    <span className="whitespace-nowrap font-medium">{step.title}</span>
                  </button>

                  {!isLast ? (
                    <span
                      className={`mx-2 hidden h-px w-8 sm:block ${
                        wizardStep > step.id ? 'bg-emerald-300' : 'bg-zinc-200'
                      }`}
                    />
                  ) : null}
                </li>
              );
            })}
          </ol>

          <div className="mt-4 border-t border-zinc-200 pt-4">
            {wizardStep === 1 ? (
              <div className="grid gap-3 md:grid-cols-2">
                <label className="block text-sm text-zinc-700 md:col-span-2">
                  Nombre del proyecto
                  <Input
                    className="mt-1"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    minLength={2}
                    placeholder="Ej: App Web Marketing"
                    required
                  />
                </label>

                <label className="block text-sm text-zinc-700 md:col-span-2">
                  Descripcion
                  <Input
                    className="mt-1"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="Opcional"
                  />
                </label>
              </div>
            ) : null}

            {wizardStep === 2 ? (
              <div className="grid gap-3 md:grid-cols-2">
                <label className="block text-sm text-zinc-700">
                  Patron i18n
                  <Select
                    containerClassName="mt-1"
                    value={i18nPattern}
                    onChange={(event) => setI18nPattern(event.target.value as I18nPattern)}
                  >
                    {PATTERNS.map((pattern) => (
                      <option key={pattern} value={pattern}>
                        {PATTERN_LABELS[pattern]}
                      </option>
                    ))}
                  </Select>
                </label>

                <div className="text-sm text-zinc-700">
                  <p className="font-medium text-zinc-900">Como funcionara</p>
                  <p className="mt-1 leading-relaxed text-zinc-600">{PATTERN_HELP[i18nPattern]}</p>
                </div>
              </div>
            ) : null}

            {wizardStep === 3 ? (
              <div className="grid gap-2 text-sm text-zinc-700">
                <p className="text-base font-medium text-zinc-900">Revision final</p>
                <p>
                  <span className="font-medium text-zinc-900">Nombre:</span> {name || '-'}
                </p>
                <p>
                  <span className="font-medium text-zinc-900">Descripcion:</span> {description || 'Sin descripcion'}
                </p>
                <p>
                  <span className="font-medium text-zinc-900">Patron:</span> {PATTERN_LABELS[i18nPattern]}
                </p>
              </div>
            ) : null}

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={wizardStep === 1 || loading}
                onClick={() => setWizardStep((prev) => Math.max(1, prev - 1) as WizardStep)}
              >
                Anterior
              </Button>

              {wizardStep < 3 ? (
                <Button
                  type="button"
                  disabled={(wizardStep === 1 && !isStepOneValid) || loading}
                  onClick={() => setWizardStep((prev) => Math.min(3, prev + 1) as WizardStep)}
                >
                  Siguiente
                </Button>
              ) : (
                <Button type="button" disabled={loading} onClick={() => void onCreate()}>
                  {loading ? 'Creando...' : 'Crear proyecto'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="mt-6 border-t border-zinc-200 pt-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
          <FolderTree size={16} className="text-zinc-700" />
          Tus proyectos
        </h2>

        {error ? (
          <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : null}

        {projects.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">Todavia no hay proyectos.</p>
        ) : (
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => (
              <li key={project.id} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
                <div className="min-h-16">
                  <p className="text-base font-semibold text-zinc-900">{project.name}</p>
                  <p className="mt-1 text-sm text-zinc-600">{PATTERN_LABELS[project.i18nPattern]}</p>
                  <p className="mt-2 line-clamp-2 text-sm text-zinc-500">{project.description || 'Sin descripcion'}</p>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <Link
                    to={`/projects/${project.id}`}
                    className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-800 hover:bg-zinc-100"
                  >
                    <Eye size={14} />
                    Ver
                  </Link>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-red-300 text-red-800 hover:bg-red-100 hover:text-red-900"
                    onClick={() => onOpenDeleteDialog(project)}
                  >
                    <Trash2 size={14} className="mr-1" />
                    Eliminar
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Dialog
        open={Boolean(projectToDelete)}
        onOpenChange={(open) => {
          if (!open) {
            setProjectToDelete(null);
            setDeleteConfirmationText('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar proyecto</DialogTitle>
            <DialogDescription>
              {`Vas a eliminar "${projectToDelete?.name ?? ''}" y todos sus datos asociados. Esta accion no se puede deshacer.`}
            </DialogDescription>
          </DialogHeader>

          <p className="text-sm text-zinc-700">Para confirmar, escribe exactamente:</p>
          <p className="text-sm font-semibold text-red-900">{confirmationPhrase}</p>
          <Input
            value={deleteConfirmationText}
            onChange={(event) => setDeleteConfirmationText(event.target.value)}
            placeholder={confirmationPhrase}
          />

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setProjectToDelete(null);
                setDeleteConfirmationText('');
              }}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              className="bg-red-800 text-white hover:bg-red-900"
              disabled={!isDeleteEnabled}
              onClick={onDeleteProject}
            >
              Confirmar eliminacion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
