import { FolderKanban, LogOut, Menu, ShieldCheck, UserRound, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import { session } from '../lib/session';
import type { AccountProfile } from '../lib/types';
import { Button } from './ui/button';

type Props = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
};

export function PageHeader({ title, subtitle, action }: Props) {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profile, setProfile] = useState<AccountProfile | null>(null);

  const spacerClassName = menuOpen ? 'mb-5 h-56 sm:h-16' : 'mb-5 h-16';

  const handleLogout = () => {
    session.clear();
    navigate('/login');
  };

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await apiRequest<AccountProfile>('/auth/profile', { auth: true });
        setProfile(data);
      } catch {
        setProfile(null);
      }
    };

    if (session.getAccessToken() || session.getRefreshToken()) {
      void loadProfile();
    }
  }, []);

  const isAdmin = profile?.role === 'ADMIN';

  // no sliding indicator: keep nav simple and rely on smooth transitions

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 w-full border-b border-zinc-200/90 bg-white/90 shadow-[0_6px_18px_rgba(0,0,0,0.04)] backdrop-blur">
        <div className="mx-auto w-full max-w-7xl px-4 md:px-6">
          <div className="sr-only" aria-live="polite">
            {title}
            {subtitle ? ` - ${subtitle}` : ''}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 py-2.5">
            <Link
              to="/projects"
              className="group inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1 transition-colors hover:bg-zinc-100"
            >
              <img src="/logo.svg" alt="i18nHub" className="h-6 w-6 rounded-md object-contain" />
              <span className="text-sm font-extrabold tracking-tight text-zinc-950">i18nHub</span>
            </Link>

            <nav className="hidden items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-1 sm:flex">
              <NavLink
                to="/projects"
                className={({ isActive }) =>
                  `inline-flex items-center gap-2 rounded-md px-2.5 py-1 text-sm font-medium transition duration-200 ease-in-out transform ${
                    isActive
                      ? 'bg-zinc-900 text-white shadow-sm scale-100'
                      : 'text-zinc-600 hover:bg-white/70 hover:text-zinc-900 hover:-translate-y-0.5'
                  }`
                }
              >
                <FolderKanban size={14} />
                Proyectos
              </NavLink>

              <NavLink
                to="/profile"
                className={({ isActive }) =>
                  `inline-flex items-center gap-2 rounded-md px-2.5 py-1 text-sm font-medium transition duration-200 ease-in-out transform ${
                    isActive
                      ? 'bg-zinc-900 text-white shadow-sm scale-100'
                      : 'text-zinc-600 hover:bg-white/70 hover:text-zinc-900 hover:-translate-y-0.5'
                  }`
                }
              >
                <UserRound size={14} />
                Mi perfil
              </NavLink>

              {isAdmin ? (
                <NavLink
                  to="/admin"
                  className={({ isActive }) =>
                    `inline-flex items-center gap-2 rounded-md px-2.5 py-1 text-sm font-medium transition duration-200 ease-in-out transform ${
                      isActive
                        ? 'bg-zinc-900 text-white shadow-sm scale-100'
                        : 'text-zinc-600 hover:bg-white/70 hover:text-zinc-900 hover:-translate-y-0.5'
                    }`
                  }
                >
                  <ShieldCheck size={14} />
                  Administración
                </NavLink>
              ) : null}
            </nav>

            {action ? <div className="hidden sm:flex">{action}</div> : null}

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="hidden border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100 sm:inline-flex"
              onClick={handleLogout}
            >
              <LogOut size={16} />
              Cerrar sesión
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100 sm:hidden"
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-expanded={menuOpen}
              aria-controls="app-header-menu"
            >
              {menuOpen ? <X size={16} /> : <Menu size={16} />}
              Menu
            </Button>
          </div>

          {menuOpen ? (
            <div id="app-header-menu" className="border-t border-zinc-200/80 py-2 sm:hidden">
              <nav className="grid gap-1">
                <NavLink
                  to="/projects"
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      isActive ? 'bg-zinc-900 text-white' : 'text-zinc-700 hover:bg-zinc-100'
                    }`
                  }
                >
                  <FolderKanban size={14} />
                  Proyectos
                </NavLink>

                <NavLink
                  to="/profile"
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      isActive ? 'bg-zinc-900 text-white' : 'text-zinc-700 hover:bg-zinc-100'
                    }`
                  }
                >
                  <UserRound size={14} />
                  Mi perfil
                </NavLink>

                {isAdmin ? (
                  <NavLink
                    to="/admin"
                    onClick={() => setMenuOpen(false)}
                    className={({ isActive }) =>
                      `inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                        isActive ? 'bg-zinc-900 text-white' : 'text-zinc-700 hover:bg-zinc-100'
                      }`
                    }
                  >
                    <ShieldCheck size={14} />
                    Administración
                  </NavLink>
                ) : null}

                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium text-red-800 transition-colors hover:bg-red-50"
                >
                  <LogOut size={14} />
                  Cerrar sesión
                </button>
              </nav>
            </div>
          ) : null}
        </div>
      </header>

      <div className={spacerClassName} aria-hidden="true" />
    </>
  );
}
