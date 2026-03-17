import { Button } from '@/components/ui/button';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import { session } from '../lib/session';
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
      navigate('/projects');
    } catch {
      setError('No se pudo iniciar sesion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <h1>Bienvenido de nuevo</h1>
        <p>Inicia sesion para gestionar tus proyectos de i18n.</p>

        <form onSubmit={onSubmit}>
          <label>
            Correo
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>

          <label>
            Contrasena
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          </label>

          {error ? <p className="error">{error}</p> : null}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Entrando...' : 'Iniciar sesion'}
          </Button>
        </form>

        <p className="auth-footer">
          Aun no tienes cuenta? <Link to="/register">Crear cuenta</Link>
        </p>
      </section>
    </main>
  );
}
