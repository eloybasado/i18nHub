import { Archive, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SiteBrand } from '../components/common/SiteBrand';
import { Button } from '../components/ui/button';

type Props = {
  action: 'login' | 'register';
};

export function ArchivedAccessPage({ action }: Props) {
  const title = action === 'login' ? 'El acceso ya no está disponible' : 'El registro ya no está disponible';

  return (
    <main className="grid min-h-screen place-items-center bg-zinc-50 px-4 py-10 text-zinc-900">
      <section className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm md:p-8">
        <SiteBrand to="/" className="border-zinc-300 bg-zinc-50 text-zinc-900 hover:bg-zinc-100" />
        <div className="mt-8 flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 text-zinc-800">
          <Archive size={24} aria-hidden="true" />
        </div>
        <p className="mt-5 text-sm font-semibold uppercase tracking-[0.12em] text-zinc-500">Proyecto archivado</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-zinc-950">{title}</h1>
        <p className="mt-4 leading-relaxed text-zinc-600">
          i18nHub fue un proyecto académico de fin de máster. El SaaS ya no está operativo, por lo que no acepta
          nuevas cuentas ni permite iniciar sesión.
        </p>
        <p className="mt-3 leading-relaxed text-zinc-600">
          La landing y la demo local se mantienen como muestra del proyecto. No introduzcas datos personales ni
          credenciales en esta página.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link to="/">
            <Button type="button">
              <ArrowLeft size={16} />
              Volver al proyecto
            </Button>
          </Link>
          <Link to="/demo">
            <Button type="button" variant="outline">
              Abrir demo local
            </Button>
          </Link>
        </div>
      </section>
    </main>
  );
}
