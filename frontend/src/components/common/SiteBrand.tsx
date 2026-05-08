import { Link } from 'react-router-dom';

type SiteBrandProps = {
  to?: string;
  className?: string;
};

export function SiteBrand({ to = '/', className = '' }: SiteBrandProps) {
  return (
    <Link
      to={to}
      className={`group inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 transition-colors hover:bg-zinc-100 ${className}`.trim()}
    >
      <img src="/logo.svg" alt="i18nHub" className="h-6 w-6 rounded-md object-contain" />
      <span className="text-sm font-extrabold tracking-tight">i18nHub</span>
    </Link>
  );
}
