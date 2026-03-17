import { Eye, FolderPlus, FolderTree, Trash2 } from 'lucide-react';
import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';
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

export function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [i18nPattern, setI18nPattern] = useState<I18nPattern>('SINGLE_FILE');
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

  const onCreate = async (event: FormEvent) => {
    event.preventDefault();
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

  const onOpenDeleteDialog = (project: Project) => {
    setProjectToDelete(project);
    setDeleteConfirmationText('');
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6">
      <PageHeader title="Proyectos" subtitle="Crea un proyecto y organiza tus archivos de traduccion." />

      <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm md:p-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
          <FolderPlus size={16} className="text-zinc-700" />
          Nuevo proyecto
        </h2>

        <form className="mt-3 grid gap-3 md:grid-cols-2" onSubmit={onCreate}>
          <label className="block text-sm text-zinc-700">
            Nombre
            <Input
              className="mt-1"
              value={name}
              onChange={(event) => setName(event.target.value)}
              minLength={2}
              required
            />
          </label>

          <label className="block text-sm text-zinc-700">
            Patron
            <Select
              className="mt-1"
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

          <label className="block text-sm text-zinc-700 md:col-span-2">
            Descripcion
            <Input
              className="mt-1"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Opcional"
            />
          </label>

          <Button type="submit" disabled={loading} className="md:col-span-2 md:w-fit">
            {loading ? 'Creando...' : 'Crear proyecto'}
          </Button>
        </form>
      </section>

      <section className="mt-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm md:p-6">
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
          <ul className="mt-3 divide-y divide-zinc-200 rounded-lg border border-zinc-200 bg-white">
            {projects.map((project) => (
              <li key={project.id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-3">
                <div>
                  <p className="text-sm font-semibold text-zinc-900">{project.name}</p>
                  <p className="text-xs text-zinc-500">{PATTERN_LABELS[project.i18nPattern]}</p>
                </div>
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
