import { Link } from 'react-router-dom';

type SiteBrandProps = {
  to?: string;
  className?: string;
  variant?: 'pill' | 'bare';
};

export function SiteBrand({ to = '/', className = '', variant = 'pill' }: SiteBrandProps) {
  if (variant === 'bare') {
    return (
      <Link to={to} className={`inline-flex w-fit self-start items-center rounded-none border-0 bg-transparent px-0 py-0 ${className}`.trim()}>
        <img src="/logo-wide.svg" alt="i18nHub" className="h-10 w-auto object-contain" />
      </Link>
    );
  }

  return (
    <Link to={to} className={`group inline-flex w-fit self-start items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 transition-colors hover:bg-zinc-100 ${className}`.trim()}>
      <img src="/logo.svg" alt="i18nHub" className="h-6 w-6 rounded-md object-contain" />
      <span className="text-sm font-extrabold tracking-tight">i18nHub</span>
    </Link>
  );
}
