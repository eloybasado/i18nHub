import { Link } from 'react-router-dom';

type SiteBrandProps = {
  to?: string;
  className?: string;
  variant?: 'pill' | 'bare';
};

export function SiteBrand({ to = '/', className = '', variant = 'pill' }: SiteBrandProps) {
  const variantClassName =
    variant === 'bare'
      ? 'group inline-flex w-fit self-start items-center gap-3 rounded-none border-0 bg-transparent px-0 py-0 hover:bg-transparent'
      : 'group inline-flex w-fit self-start items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 transition-colors hover:bg-zinc-100';

  const logoClassName = variant === 'bare' ? 'h-8 w-8 rounded-xl object-contain' : 'h-6 w-6 rounded-md object-contain';
  const labelClassName =
    variant === 'bare' ? 'text-base font-black tracking-tight text-zinc-950' : 'text-sm font-extrabold tracking-tight';

  return (
    <Link to={to} className={`${variantClassName} ${className}`.trim()}>
      <img src="/logo.svg" alt="i18nHub" className={logoClassName} />
      <span className={labelClassName}>i18nHub</span>
    </Link>
  );
}
