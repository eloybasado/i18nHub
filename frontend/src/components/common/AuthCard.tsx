import type { ReactNode } from 'react';

type AuthCardProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
};

export function AuthCard({ title, subtitle, children, footer }: AuthCardProps) {
  return (
    <section className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h1 className="text-3xl font-bold tracking-tight text-zinc-950">{title}</h1>
      <p className="mt-2 text-sm text-zinc-600">{subtitle}</p>

      <div className="mt-5">{children}</div>

      <p className="mt-4 text-sm text-zinc-600">{footer}</p>
    </section>
  );
}
