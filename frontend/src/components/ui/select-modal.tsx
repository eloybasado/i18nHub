import { cn } from '@/lib/utils';
import { Check, ChevronDown } from 'lucide-react';
import { useMemo, useState, type ComponentType } from 'react';
import { Button } from './button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './dialog';

export type SelectModalOption<T extends string = string> = {
  value: T;
  label: string;
  description?: string;
  icon?: ComponentType<{ size?: number; className?: string }>;
};

type SelectModalProps<T extends string = string> = {
  value: T;
  options: SelectModalOption<T>[];
  onChange: (value: T) => void;
  title: string;
  description?: string;
  placeholder?: string;
  disabled?: boolean;
  triggerClassName?: string;
  contentClassName?: string;
  gridClassName?: string;
};

export function SelectModal<T extends string = string>({
  value,
  options,
  onChange,
  title,
  description,
  placeholder = 'Selecciona una opcion',
  disabled,
  triggerClassName,
  contentClassName,
  gridClassName,
}: SelectModalProps<T>) {
  const [open, setOpen] = useState(false);

  const selectedOption = useMemo(() => {
    return options.find((option) => option.value === value) ?? null;
  }, [options, value]);
  const SelectedIcon = selectedOption?.icon;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn('w-full min-w-0 justify-between gap-2 overflow-hidden', triggerClassName)}
          disabled={disabled}
          title={selectedOption ? selectedOption.label : placeholder}
        >
          <span className="flex min-w-0 items-center gap-2">
            {SelectedIcon ? (
              <SelectedIcon size={16} className="shrink-0 text-zinc-600" />
            ) : (
              <ChevronDown size={16} className="shrink-0 text-zinc-500" />
            )}
            <span className="min-w-0 truncate text-left text-sm text-zinc-900">
              {selectedOption ? selectedOption.label : placeholder}
            </span>
          </span>

          <ChevronDown size={16} className="shrink-0 text-zinc-500" />
        </Button>
      </DialogTrigger>

      <DialogContent className={cn('max-w-3xl', contentClassName)}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>

        <div className={cn('grid grid-cols-1 gap-2 md:grid-cols-2', gridClassName)}>
          {options.map((option) => {
            const selected = option.value === value;
            const Icon = option.icon;

            return (
              <button
                key={option.value}
                type="button"
                className={cn(
                  'rounded-xl border p-3 text-left transition-colors',
                  selected
                    ? 'border-zinc-900 bg-zinc-900 text-white shadow-sm'
                    : 'border-zinc-200 bg-white text-zinc-900 hover:border-zinc-300 hover:bg-zinc-50',
                )}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-semibold">
                      {Icon ? <Icon size={16} className={selected ? 'text-zinc-100' : 'text-zinc-700'} /> : null}
                      <span className="truncate">{option.label}</span>
                    </p>
                    {option.description ? (
                      <p className={cn('mt-1 text-xs', selected ? 'text-zinc-200' : 'text-zinc-600')}>
                        {option.description}
                      </p>
                    ) : null}
                  </div>

                  {selected ? <Check size={15} className="shrink-0 text-zinc-100" /> : null}
                </div>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
