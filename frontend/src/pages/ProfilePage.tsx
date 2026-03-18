import { ShieldCheck, UserRound } from 'lucide-react';
import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { apiRequest } from '../lib/api';
import { session } from '../lib/session';
import { notify } from '../lib/toast';
import type { AccountProfile } from '../lib/types';

export function ProfilePage() {
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadProfile = async () => {
    try {
      const data = await apiRequest<AccountProfile>('/auth/profile', { auth: true });
      setProfile(data);
      setName(data.name);
    } catch {
      const message = 'No se pudo cargar tu perfil';
      setError(message);
      notify.error(message);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const onSaveProfile = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const updated = await apiRequest<AccountProfile>('/auth/profile', {
        method: 'PATCH',
        auth: true,
        body: { name },
      });

      setProfile(updated);
      setName(updated.name);
      notify.success('Perfil actualizado');
    } catch {
      const message = 'No se pudo actualizar el perfil';
      setError(message);
      notify.error(message);
    } finally {
      setLoading(false);
    }
  };

  const onLogoutAll = async () => {
    setLoading(true);
    setError('');

    try {
      await apiRequest('/auth/logout-all', {
        method: 'POST',
        auth: true,
      });
      session.clear();
      notify.success('Sesion cerrada en todos los dispositivos');
      window.location.href = '/login';
    } catch {
      const message = 'No se pudo cerrar sesion en todos los dispositivos';
      setError(message);
      notify.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 md:px-6">
      <PageHeader title="Mi perfil" subtitle="Gestiona tu informacion de cuenta y opciones de sesion." />

      {error ? (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}

      <section className="mt-4 py-1">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
          <UserRound size={16} />
          Informacion de la cuenta
        </h2>

        <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={onSaveProfile}>
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
            Correo
            <Input className="mt-1" value={profile?.email ?? ''} disabled />
          </label>

          <label className="block text-sm text-zinc-700">
            Rol
            <Input className="mt-1" value={profile?.role ?? '-'} disabled />
          </label>

          <label className="block text-sm text-zinc-700">
            Plan
            <Input className="mt-1" value={profile?.tier ?? '-'} disabled />
          </label>

          <label className="block text-sm text-zinc-700 md:col-span-2">
            Cuenta creada
            <Input
              className="mt-1"
              value={profile ? new Date(profile.createdAt).toLocaleString('es-ES') : ''}
              disabled
            />
          </label>

          <Button type="submit" disabled={loading} className="md:col-span-2 md:w-fit">
            {loading ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </form>
      </section>

      <section className="mt-6 border-t border-zinc-200 pt-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
          <ShieldCheck size={16} />
          Seguridad y sesion
        </h2>

        <p className="mt-2 text-sm text-zinc-600">
          Si detectas actividad sospechosa, puedes revocar la sesion actual y cualquier sesion abierta en otros
          dispositivos.
        </p>

        <Button
          type="button"
          className="mt-4 bg-red-800 text-white hover:bg-red-900"
          disabled={loading}
          onClick={onLogoutAll}
        >
          Cerrar sesion en todos los dispositivos
        </Button>
      </section>
    </main>
  );
}
