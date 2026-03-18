import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';
import * as React from 'react';

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  containerClassName?: string;
};

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, containerClassName, children, ...props }, ref) => {
    return (
      <div className={cn('relative', containerClassName)}>
        <select
          ref={ref}
          className={cn(
            'w-full appearance-none rounded-lg border border-zinc-300 bg-white px-3 py-2.5 pr-9 text-sm text-zinc-900 outline-none transition-colors focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200 disabled:cursor-not-allowed disabled:opacity-60',
            className,
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          size={16}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500"
        />
      </div>
    );
  },
);

Select.displayName = 'Select';

export { Select };
