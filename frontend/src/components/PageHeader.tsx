import { FolderKanban, LogOut, Menu, ShieldCheck, UserRound, X } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { apiRequest } from '../lib/api';
import { session } from '../lib/session';
import type { AccountProfile } from '../lib/types';
import { SiteBrand } from './common/SiteBrand';
import { Button } from './ui/button';

const PAGE_TITLE: Record<string, string> = {
  '/projects': 'Proyectos',
  '/profile': 'Mi perfil',
  '/admin': 'Administración',
};

export function PageHeader() {
  const navigate = useNavigate();
  const location = useLocation();
  const pageTitle = Object.entries(PAGE_TITLE).find(([path]) =>
    location.pathname === path || location.pathname.startsWith(path + '/'),
  )?.[1] ?? 'i18nHub';
  const [menuOpen, setMenuOpen] = useState(false);
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const [pill, setPill] = useState({ left: 0, width: 0 });
  const [pillReady, setPillReady] = useState(false);

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

  const pillInitialized = useRef(false);
  const pendingPillPos = useRef<{ left: number; width: number } | null>(null);

  const measurePill = (nav: HTMLElement | null) => {
    if (!nav) return null;
    const active = nav.querySelector<HTMLElement>('[aria-current="page"]');
    if (!active) return null;
    return { left: active.offsetLeft, width: active.offsetWidth };
  };

  // Before first paint: place pill instantly at the correct position (no animation)
  // On navigation: store pending position without touching state, so the browser still
  // paints the pill at the OLD position — giving the CSS transition something to slide from
  useLayoutEffect(() => {
    const pos = measurePill(navRef.current);
    if (!pos) return;
    if (!pillInitialized.current) {
      pillInitialized.current = true;
      setPill(pos);
    } else {
      pendingPillPos.current = pos;
    }
  }, [location.pathname, isAdmin]);

  // After every paint: apply pending position (triggers the slide) and ensure transition is on
  useEffect(() => {
    if (pendingPillPos.current) {
      setPill(pendingPillPos.current);
      pendingPillPos.current = null;
    }
    if (!pillReady) setPillReady(true);
  }, [location.pathname, isAdmin]);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 w-full border-b border-zinc-200/90 bg-white/90 shadow-[0_6px_18px_rgba(0,0,0,0.04)] backdrop-blur">
        <div className="mx-auto w-full max-w-7xl px-4 md:px-6">
          <div className="sr-only" aria-live="polite">{pageTitle}</div>
          <div className="flex flex-wrap items-center justify-between gap-2 py-2.5">
            <SiteBrand to="/projects" variant="bare" className="hidden sm:flex" />

            <nav ref={navRef} className="relative hidden items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-1 sm:flex">
              <div
                aria-hidden
                className={`pointer-events-none absolute top-1 bottom-1 rounded-md bg-zinc-900 ${
                  pillReady ? 'transition-[left,width] duration-200 ease-out' : ''
                }`}
                style={{ left: pill.left, width: pill.width }}
              />
              <NavLink
                to="/projects"
                className={({ isActive }) =>
                  `relative z-10 inline-flex items-center gap-2 rounded-md px-2.5 py-1 text-sm font-medium ${
                    isActive
                      ? 'text-white [transition:color_0ms_180ms]'
                      : 'text-zinc-600 transition-colors duration-150 hover:text-zinc-900'
                  }`
                }
              >
                <FolderKanban size={14} />
                Proyectos
              </NavLink>

              <NavLink
                to="/profile"
                className={({ isActive }) =>
                  `relative z-10 inline-flex items-center gap-2 rounded-md px-2.5 py-1 text-sm font-medium ${
                    isActive
                      ? 'text-white [transition:color_0ms_180ms]'
                      : 'text-zinc-600 transition-colors duration-150 hover:text-zinc-900'
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
                    `relative z-10 inline-flex items-center gap-2 rounded-md px-2.5 py-1 text-sm font-medium ${
                      isActive
                        ? 'text-white [transition:color_0ms_180ms]'
                        : 'text-zinc-600 transition-colors duration-150 hover:text-zinc-900'
                    }`
                  }
                >
                  <ShieldCheck size={14} />
                  Administración
                </NavLink>
              ) : null}
            </nav>

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
