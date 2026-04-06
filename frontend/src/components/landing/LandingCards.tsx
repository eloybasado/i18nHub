import { cn } from '@/lib/utils';
import type { ComponentType } from 'react';

type CardIconProps = {
  size?: number;
  className?: string;
};

type FeatureCardProps = {
  icon: ComponentType<CardIconProps>;
  title: string;
  description: string;
  eyebrow?: string;
  className?: string;
};

type StepCardProps = {
  step: string;
  title: string;
  description: string;
  className?: string;
};

export function FeatureCard({ icon: Icon, title, description, eyebrow, className }: FeatureCardProps) {
  return (
    <article className={cn('rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm', className)}>
      <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 text-zinc-900">
        <Icon size={24} />
      </div>

      {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.1em] text-zinc-500">{eyebrow}</p> : null}

      <h3 className={cn('text-lg font-bold tracking-tight text-zinc-900', eyebrow ? 'mt-1' : '')}>{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-zinc-600">{description}</p>
    </article>
  );
}

export function StepCard({ step, title, description, className }: StepCardProps) {
  return (
    <li className={cn('rounded-xl border border-white/15 bg-white/5 p-4', className)}>
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-zinc-300">{step}</p>
      <p className="mt-1 text-base font-semibold">{title}</p>
      <p className="mt-1 text-sm text-zinc-300">{description}</p>
    </li>
  );
}
