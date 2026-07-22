import { Link } from 'react-router-dom';
import { PublicHeader } from '../components/common/PublicHeader';

export function LegalNoticePage() {
  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900">
      <PublicHeader className="bg-white" brandTo="/" rightSlot={<Link to="/" className="text-sm font-medium text-zinc-600 hover:text-zinc-900">Volver al inicio</Link>} />
      <section className="mx-auto w-full max-w-4xl px-4 py-8 md:px-6 md:py-10"><div className="rounded-2xl border border-zinc-200 bg-white p-6 md:p-8">
        <h1 className="text-3xl font-black tracking-tight text-zinc-950 md:text-4xl">Aviso legal</h1>
        <p className="mt-3 text-sm text-zinc-500">Última actualización: 22 de julio de 2026</p>
        <div className="mt-7 space-y-6 text-sm leading-relaxed text-zinc-700 md:text-base">
          <section><h2 className="text-base font-bold text-zinc-900 md:text-lg">Responsable</h2><p className="mt-2">i18nHub es un proyecto académico independiente operado por Eloy Paredes Muñiz desde España.</p></section>
          <section><h2 className="text-base font-bold text-zinc-900 md:text-lg">Estado del servicio</h2><p className="mt-2">La web mantiene una landing y una demo local como muestra del proyecto. El SaaS está archivado y no se ofrece como servicio activo.</p></section>
          <section><h2 className="text-base font-bold text-zinc-900 md:text-lg">Contacto</h2><p className="mt-2">Para cuestiones generales o legales, escribe a <a className="font-medium text-zinc-900 underline" href="mailto:support@byndleapp.com">support@byndleapp.com</a>.</p></section>
        </div>
      </div></section>
    </main>
  );
}
