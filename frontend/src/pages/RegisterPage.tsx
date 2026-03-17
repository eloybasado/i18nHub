import { Button } from '@/components/ui/button';
import type { FormEvent } from 'react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import { session } from '../lib/session';
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

      session.setAccessToken(result.accessToken);
      navigate('/projects');
    } catch {
      setError('No se pudo crear la cuenta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <h1>Crear cuenta</h1>
        <p>Empieza a organizar tu flujo de traducciones.</p>

        <form onSubmit={onSubmit}>
          <label>
            Nombre
            <input type="text" value={name} onChange={(event) => setName(event.target.value)} required />
          </label>

          <label>
            Correo
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>

          <label>
            Contrasena
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              required
            />
          </label>

          {error ? <p className="error">{error}</p> : null}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </Button>
        </form>

        <p className="auth-footer">
          Ya tienes cuenta? <Link to="/login">Iniciar sesion</Link>
        </p>
      </section>
    </main>
  );
}
