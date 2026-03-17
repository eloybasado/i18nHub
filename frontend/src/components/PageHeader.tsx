import { Languages, LogOut } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { session } from '../lib/session';
import { Button } from './ui/button';

type Props = {
  title: string;
  subtitle?: string;
};

export function PageHeader({ title, subtitle }: Props) {
  const navigate = useNavigate();

  const handleLogout = () => {
    session.clear();
    navigate('/login');
  };

  return (
    <header className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 pb-3">
      <div className="inline-flex items-center gap-2 text-sm font-extrabold tracking-tight text-zinc-950">
        <Languages size={18} className="text-zinc-800" />
        <Link to="/projects">i18nHub</Link>
      </div>

      <div className="min-w-[220px] flex-1">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-950">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-zinc-600">{subtitle}</p> : null}
      </div>

      <Button type="button" variant="outline" onClick={handleLogout}>
        <LogOut size={16} />
        Cerrar sesion
      </Button>
    </header>
  );
}
