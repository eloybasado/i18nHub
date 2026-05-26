import { Edit3, FolderKanban, Save, Trash2, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '../components/ui/button';
import { ConfirmModal } from '../components/ui/confirm-modal';
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
import type { AccountProfile, AdminProject, AdminUser, I18nPattern } from '../lib/types';

const PATTERNS: I18nPattern[] = ['SINGLE_FILE', 'FOLDER_PER_LOCALE', 'SUFFIX', 'PREFIX'];

const PATTERN_LABELS: Record<I18nPattern, string> = {
  SINGLE_FILE: 'Archivo unico por idioma',
  FOLDER_PER_LOCALE: 'Carpeta por idioma',
  SUFFIX: 'Sufijo (home_es.json)',
  PREFIX: 'Prefijo (es_home.json)',
};

export function AdminPage() {
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersPage, setUsersPage] = useState(1);
  const [usersPerPage, setUsersPerPage] = useState(20);
  const [usersQuery, setUsersQuery] = useState('');
  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [projectsTotal, setProjectsTotal] = useState(0);
  const [projectsPage, setProjectsPage] = useState(1);
  const [projectsPerPage, setProjectsPerPage] = useState(10);
  const [projectsQuery, setProjectsQuery] = useState('');
  const [tierDrafts, setTierDrafts] = useState<Record<string, 'FREE' | 'PRO'>>({});
  const [usersLoading, setUsersLoading] = useState(false);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [projectToEdit, setProjectToEdit] = useState<AdminProject | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<AdminProject | null>(null);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [projectPattern, setProjectPattern] = useState<I18nPattern>('SINGLE_FILE');
  const [savingProject, setSavingProject] = useState(false);
  const [error, setError] = useState('');

  const isAdmin = profile?.role === 'ADMIN';

  const loadProfile = async () => {
    const data = await apiRequest<AccountProfile>('/auth/profile', { auth: true });
    setProfile(data);
  };

  const loadUsers = async (page = usersPage, perPage = usersPerPage, q = usersQuery) => {
    setUsersLoading(true);
    try {
      const url = new URL('/admin/users', window.location.origin);
      url.searchParams.set('page', String(page));
      url.searchParams.set('perPage', String(perPage));
      if (q) url.searchParams.set('q', q);

      const data = await apiRequest<{ items: AdminUser[]; total: number; page: number; perPage: number }>(
        url.pathname + url.search,
        { auth: true },
      );

      setUsers(data.items);
      setUsersTotal(data.total);
      setUsersPage(data.page);
      setUsersPerPage(data.perPage);
      setTierDrafts(
        Object.fromEntries(data.items.map((user) => [user.id, user.tier])) as Record<string, 'FREE' | 'PRO'>,
      );
    } catch {
      throw new Error('No se pudieron cargar los usuarios');
    } finally {
      setUsersLoading(false);
    }
  };

  const loadProjects = async (page = projectsPage, perPage = projectsPerPage, q = projectsQuery) => {
    setProjectsLoading(true);
    try {
      const url = new URL('/admin/projects', window.location.origin);
      url.searchParams.set('page', String(page));
      url.searchParams.set('perPage', String(perPage));
      if (q) url.searchParams.set('q', q);

      const data = await apiRequest<{ items: AdminProject[]; total: number; page: number; perPage: number }>(
        url.pathname + url.search,
        { auth: true },
      );

      setProjects(data.items);
      setProjectsTotal(data.total);
      setProjectsPage(data.page);
      setProjectsPerPage(data.perPage);
    } catch {
      throw new Error('No se pudieron cargar los proyectos');
    } finally {
      setProjectsLoading(false);
    }
  };

  const loadAdminData = async () => {
    setError('');
    try {
      await Promise.all([loadUsers(), loadProjects()]);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : 'No se pudo cargar la administración';
      setError(message);
      notify.error(message);
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        await loadProfile();
      } catch {
        setError('No se pudo verificar el acceso');
        return;
      }
    };

    void init();
  }, []);

  useEffect(() => {
    if (!isAdmin) return;

    void loadAdminData();
  }, [isAdmin]);

  // React to users/projects pagination / query changes
  useEffect(() => {
    if (!isAdmin) return;
    void loadUsers(usersPage, usersPerPage, usersQuery);
  }, [usersPage, usersPerPage, usersQuery]);

  useEffect(() => {
    if (!isAdmin) return;
    void loadProjects(projectsPage, projectsPerPage, projectsQuery);
  }, [projectsPage, projectsPerPage, projectsQuery]);

  const openProjectEditor = (project: AdminProject) => {
    setProjectToEdit(project);
    setProjectName(project.name);
    setProjectDescription(project.description ?? '');
    setProjectPattern(project.i18nPattern);
  };

  const saveUserTier = async (userId: string) => {
    const tier = tierDrafts[userId];
    if (!tier) {
      return;
    }

    setSavingUserId(userId);
    setError('');

    try {
      const updated = await apiRequest<AdminUser>(`/admin/users/${userId}/tier`, {
        method: 'PATCH',
        auth: true,
        body: { tier },
      });

      setUsers((currentUsers) => currentUsers.map((user) => (user.id === userId ? updated : user)));
      setTierDrafts((currentDrafts) => ({ ...currentDrafts, [userId]: updated.tier }));
      notify.success('Tier actualizado');
    } catch {
      const message = 'No se pudo actualizar el tier';
      setError(message);
      notify.error(message);
    } finally {
      setSavingUserId(null);
    }
  };

  const saveProject = async () => {
    if (!projectToEdit) {
      return;
    }

    setSavingProject(true);
    setError('');

    try {
      const updated = await apiRequest<AdminProject>(`/admin/projects/${projectToEdit.id}`, {
        method: 'PATCH',
        auth: true,
        body: {
          name: projectName,
          description: projectDescription || undefined,
          i18nPattern: projectPattern,
        },
      });

      setProjects((currentProjects) =>
        currentProjects.map((project) => (project.id === projectToEdit.id ? updated : project)),
      );
      setProjectToEdit(null);
      notify.success('Proyecto actualizado');
    } catch {
      const message = 'No se pudo actualizar el proyecto';
      setError(message);
      notify.error(message);
    } finally {
      setSavingProject(false);
    }
  };

  const deleteProject = async () => {
    if (!projectToDelete) {
      return;
    }

    setError('');

    try {
      await apiRequest(`/admin/projects/${projectToDelete.id}`, {
        method: 'DELETE',
        auth: true,
      });
      setProjects((currentProjects) => currentProjects.filter((project) => project.id !== projectToDelete.id));
      setProjectToDelete(null);
      notify.success('Proyecto eliminado');
    } catch {
      const message = 'No se pudo eliminar el proyecto';
      setError(message);
      notify.error(message);
    }
  };

  if (!profile) {
    return (
      <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6">
        {error ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : null}
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="mx-auto w-full max-w-4xl px-4 py-6 md:px-6">
        <section className="mt-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-zinc-900">No tienes permisos para acceder a esta sección.</p>
          <p className="mt-2 text-sm text-zinc-600">
            Solo los usuarios con rol ADMIN pueden gestionar usuarios y proyectos.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6">
      {error ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}

      <section className="mt-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
              <Users size={16} />
              Usuarios del sistema
            </h2>
            <p className="mt-1 text-sm text-zinc-600">
              {usersLoading ? 'Cargando usuarios...' : `${usersTotal} usuarios`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Buscar usuarios por nombre o email"
              value={usersQuery}
              onChange={(e) => setUsersQuery(e.target.value)}
              className="w-64"
            />
            <Select value={String(usersPerPage)} onChange={(e) => setUsersPerPage(parseInt(e.target.value, 10))}>
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </Select>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-y-2 text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-zinc-500">
                <th className="px-3 py-2 font-medium">Usuario</th>
                <th className="px-3 py-2 font-medium">Rol</th>
                <th className="px-3 py-2 font-medium">Tier</th>
                <th className="px-3 py-2 font-medium">Proyectos</th>
                <th className="px-3 py-2 font-medium">Miembro</th>
                <th className="px-3 py-2 font-medium">Alta</th>
                <th className="px-3 py-2 font-medium">Acción</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="rounded-xl bg-zinc-50 align-top">
                  <td className="px-3 py-3">
                    <div className="font-medium text-zinc-900">{user.name}</div>
                    <div className="text-xs text-zinc-500">{user.email}</div>
                  </td>
                  <td className="px-3 py-3 text-zinc-700">{user.role}</td>
                  <td className="px-3 py-3">
                    <Select
                      value={tierDrafts[user.id] ?? user.tier}
                      onChange={(event) =>
                        setTierDrafts((currentDrafts) => ({
                          ...currentDrafts,
                          [user.id]: event.target.value as 'FREE' | 'PRO',
                        }))
                      }
                      containerClassName="min-w-[130px]"
                    >
                      <option value="FREE">FREE</option>
                      <option value="PRO">PRO</option>
                    </Select>
                  </td>
                  <td className="px-3 py-3 text-zinc-700">{user.ownedProjectsCount}</td>
                  <td className="px-3 py-3 text-zinc-700">{user.membershipsCount}</td>
                  <td className="px-3 py-3 text-zinc-700">{new Date(user.createdAt).toLocaleDateString('es-ES')}</td>
                  <td className="px-3 py-3">
                    <Button
                      type="button"
                      size="sm"
                      disabled={savingUserId === user.id}
                      onClick={() => void saveUserTier(user.id)}
                    >
                      <Save size={14} className="mr-1.5" />
                      {savingUserId === user.id ? 'Guardando...' : 'Guardar'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <div className="text-xs text-zinc-600">
            Mostrando {(usersPage - 1) * usersPerPage + 1} - {Math.min(usersPage * usersPerPage, usersTotal)} de{' '}
            {usersTotal}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={usersPage <= 1}
              onClick={() => setUsersPage((p) => Math.max(1, p - 1))}
            >
              Anterior
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={usersPage * usersPerPage >= usersTotal}
              onClick={() => setUsersPage((p) => p + 1)}
            >
              Siguiente
            </Button>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
              <FolderKanban size={16} />
              Proyectos del sistema
            </h2>
            <p className="mt-1 text-sm text-zinc-600">
              {projectsLoading ? 'Cargando proyectos...' : `${projectsTotal} proyectos`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Buscar proyectos"
              value={projectsQuery}
              onChange={(e) => setProjectsQuery(e.target.value)}
              className="w-64"
            />
            <Select value={String(projectsPerPage)} onChange={(e) => setProjectsPerPage(parseInt(e.target.value, 10))}>
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="20">20</option>
            </Select>
          </div>
        </div>

        <div className="mt-4 grid gap-3">
          {projects.map((project) => (
            <article key={project.id} className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-zinc-900">{project.name}</p>
                  <p className="mt-1 text-sm text-zinc-600">{project.description || 'Sin descripción'}</p>
                  <p className="mt-2 text-xs text-zinc-500">
                    {PATTERN_LABELS[project.i18nPattern]} · Owner {project.owner.name} · {project.owner.email}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => openProjectEditor(project)}>
                    <Edit3 size={14} className="mr-1.5" />
                    Editar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="bg-red-800 text-white hover:bg-red-900"
                    onClick={() => setProjectToDelete(project)}
                  >
                    <Trash2 size={14} className="mr-1.5" />
                    Eliminar
                  </Button>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-600">
                <span className="rounded-full border border-zinc-200 bg-white px-2 py-1">
                  {project.membersCount} miembros
                </span>
                <span className="rounded-full border border-zinc-200 bg-white px-2 py-1">
                  {project.languagesCount} idiomas
                </span>
                <span className="rounded-full border border-zinc-200 bg-white px-2 py-1">
                  {project.fileGroupsCount} grupos
                </span>
                <span className="rounded-full border border-zinc-200 bg-white px-2 py-1">
                  Creado {new Date(project.createdAt).toLocaleDateString('es-ES')}
                </span>
              </div>
            </article>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between">
          <div className="text-xs text-zinc-600">
            Mostrando {(projectsPage - 1) * projectsPerPage + 1} -{' '}
            {Math.min(projectsPage * projectsPerPage, projectsTotal)} de {projectsTotal}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={projectsPage <= 1}
              onClick={() => setProjectsPage((p) => Math.max(1, p - 1))}
            >
              Anterior
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={projectsPage * projectsPerPage >= projectsTotal}
              onClick={() => setProjectsPage((p) => p + 1)}
            >
              Siguiente
            </Button>
          </div>
        </div>
      </section>

      <Dialog open={Boolean(projectToEdit)} onOpenChange={(open) => !open && setProjectToEdit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar proyecto</DialogTitle>
            <DialogDescription>Modifica la información básica del proyecto.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <label className="block text-sm text-zinc-700">
              Nombre
              <Input className="mt-1" value={projectName} onChange={(event) => setProjectName(event.target.value)} />
            </label>

            <label className="block text-sm text-zinc-700">
              Descripción
              <Input
                className="mt-1"
                value={projectDescription}
                onChange={(event) => setProjectDescription(event.target.value)}
              />
            </label>

            <label className="block text-sm text-zinc-700">
              Patrón i18n
              <Select
                containerClassName="mt-1"
                value={projectPattern}
                onChange={(event) => setProjectPattern(event.target.value as I18nPattern)}
              >
                {PATTERNS.map((pattern) => (
                  <option key={pattern} value={pattern}>
                    {PATTERN_LABELS[pattern]}
                  </option>
                ))}
              </Select>
            </label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setProjectToEdit(null)}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => void saveProject()} disabled={savingProject}>
              {savingProject ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmModal
        open={Boolean(projectToDelete)}
        onOpenChange={(open) => !open && setProjectToDelete(null)}
        title="Eliminar proyecto"
        description={`Vas a eliminar ${projectToDelete?.name ?? 'este proyecto'} de forma permanente.`}
        onConfirm={() => void deleteProject()}
        confirmLabel="Eliminar"
      />
    </main>
  );
}
