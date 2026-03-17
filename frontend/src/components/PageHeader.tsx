import { Languages, LogOut } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { session } from '../lib/session';

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
    <header className="page-header">
      <div className="brand">
        <Languages size={18} />
        <Link to="/projects">i18nHub</Link>
      </div>

      <div className="title-block">
        <h1>{title}</h1>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>

      <button className="ghost" onClick={handleLogout}>
        <LogOut size={16} />
        Cerrar sesion
      </button>
    </header>
  );
}
