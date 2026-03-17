import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthCard } from '../components/common/AuthCard';
import { apiRequest } from '../lib/api';
import { session } from '../lib/session';
import { notify } from '../lib/toast';
import type { AuthResponse } from '../lib/types';

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await apiRequest<AuthResponse>('/auth/login', {
        method: 'POST',
        body: { email, password },
      });

      session.setAccessToken(result.accessToken);
      notify.success('Sesion iniciada');
      navigate('/projects');
    } catch {
      const message = 'No se pudo iniciar sesion';
      setError(message);
      notify.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center px-4 py-8">
      <AuthCard
        title="Bienvenido de nuevo"
        subtitle="Inicia sesion para gestionar tus proyectos de i18n."
        footer={
          <>
            Aun no tienes cuenta?{' '}
            <Link to="/register" className="font-semibold text-zinc-900 hover:underline">
              Crear cuenta
            </Link>
          </>
        }
      >
        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block text-sm text-zinc-700">
            Correo
            <Input
              className="mt-1"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label className="block text-sm text-zinc-700">
            Contrasena
            <Input
              className="mt-1"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          {error ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          ) : null}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Entrando...' : 'Iniciar sesion'}
          </Button>
        </form>
      </AuthCard>
    </main>
  );
}
