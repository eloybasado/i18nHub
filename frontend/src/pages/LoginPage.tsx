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

      session.setTokens(result.accessToken, result.refreshToken);
      notify.success('Sesión iniciada');
      navigate('/projects');
    } catch {
      const message = 'No se pudo iniciar sesión';
      setError(message);
      notify.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="grid min-h-screen md:grid-cols-2">
        <section className="relative hidden overflow-hidden border-r border-zinc-200 bg-zinc-100 md:flex">
          <DotLottieReact
            src="/animations/world-map-scroll.lottie"
            autoplay
            loop
            className="h-full w-full opacity-95"
          />
          <div className="absolute inset-0 bg-[linear-gradient(130deg,rgba(244,244,245,0.4)_0%,rgba(244,244,245,0.05)_50%,rgba(244,244,245,0.6)_100%)]" />

          <div className="absolute inset-0 flex flex-col justify-between p-8 text-zinc-900">
            <SiteBrand to="/" className="border-zinc-300 bg-white/90 text-zinc-900 hover:bg-zinc-100" />

            <div className="max-w-md space-y-3">
              <h1 className="text-4xl font-black tracking-tight">Vuelve a tus proyectos de traducción</h1>
              <p className="text-zinc-700">
                Revisa análisis, corrige claves y exporta traducciones con un flujo limpio para frontend.
              </p>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center px-4 py-10 md:px-8">
          <div className="w-full max-w-md">
            <h2 className="text-3xl font-black tracking-tight text-zinc-950">Bienvenido de nuevo</h2>
            <p className="mt-2 text-base text-zinc-600">Inicia sesión para gestionar tus proyectos de i18n.</p>

            <form onSubmit={onSubmit} className="mt-8 space-y-4">
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
                  required
                />
              </label>

              {error ? (
                <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
              ) : null}

              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Entrando...' : 'Iniciar sesión'}
              </Button>
            </form>

            <p className="mt-5 text-sm text-zinc-600">
              ¿Aún no tienes cuenta?{' '}
              <Link to="/register" className="font-semibold text-zinc-900 hover:underline">
                Crear cuenta
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
