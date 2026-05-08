import type { ReactNode } from 'react';
import { SiteBrand } from './SiteBrand';

type PublicHeaderProps = {
  rightSlot?: ReactNode;
  className?: string;
  brandTo?: string;
};

export function PublicHeader({ rightSlot, className = '', brandTo = '/' }: PublicHeaderProps) {
  return (
    <header className={`border-b border-zinc-200 bg-white ${className}`.trim()}>
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-3 md:px-6">
        <SiteBrand to={brandTo} />
        {rightSlot ? <div className="flex items-center gap-2">{rightSlot}</div> : null}
      </div>
    </header>
  );
}
