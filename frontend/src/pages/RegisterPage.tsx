import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SiteBrand } from '../components/common/SiteBrand';
import { apiRequest } from '../lib/api';
import { session } from '../lib/session';
import { notify } from '../lib/toast';
import type { AuthResponse } from '../lib/types';

export function RegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await apiRequest<AuthResponse>('/auth/register', {
        method: 'POST',
        body: { name, email, password },
      });

      session.setTokens(result.accessToken, result.refreshToken);
      notify.success('Cuenta creada correctamente');
      navigate('/projects');
    } catch {
      const message = 'No se pudo crear la cuenta';
      setError(message);
      notify.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="grid min-h-screen md:grid-cols-2">
        <section className="relative hidden overflow-hidden border-r border-zinc-200 bg-zinc-900 md:flex">
          <DotLottieReact
            src="/animations/upload-files-loader.lottie"
            autoplay
            loop
            className="h-full w-full opacity-85"
          />
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(24,24,27,0.78)_0%,rgba(24,24,27,0.46)_45%,rgba(24,24,27,0.82)_100%)]" />

          <div className="absolute inset-0 flex flex-col justify-between p-8 text-zinc-100">
            <SiteBrand to="/" className="border-zinc-700 bg-zinc-800/70 text-zinc-100 hover:bg-zinc-800" />

            <div className="max-w-md space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-300">Comienza rápido</p>
              <h1 className="text-4xl font-black tracking-tight">Crea tu espacio de localización</h1>
              <p className="text-zinc-300">
                Sube archivos JSON, analiza diferencias entre idiomas y mantén tu i18n ordenado desde el primer día.
              </p>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center px-4 py-10 md:px-8">
          <div className="w-full max-w-md">
            <h2 className="text-3xl font-black tracking-tight text-zinc-950">Crear cuenta</h2>
            <p className="mt-2 text-base text-zinc-600">Empieza a organizar tu flujo de traducciones.</p>

            <form onSubmit={onSubmit} className="mt-8 space-y-4">
              <label className="block text-sm text-zinc-700">
                Nombre
                <Input
                  className="mt-1"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                />
              </label>

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
                Contraseña
                <Input
                  className="mt-1"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  minLength={8}
                  required
                />
              </label>

              {error ? (
                <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
              ) : null}

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Creando cuenta...' : 'Crear cuenta'}
              </Button>
            </form>

            <p className="mt-5 text-sm text-zinc-600">
              Ya tienes cuenta?{' '}
              <Link to="/login" className="font-semibold text-zinc-900 hover:underline">
                Iniciar sesión
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
