import { Link } from 'react-router-dom';
import { PublicHeader } from '../components/common/PublicHeader';

export function TermsOfUsePage() {
  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900">
      <PublicHeader className="bg-white" brandTo="/" rightSlot={<Link to="/" className="text-sm font-medium text-zinc-600 hover:text-zinc-900">Volver al inicio</Link>} />
      <section className="mx-auto w-full max-w-4xl px-4 py-8 md:px-6 md:py-10"><div className="rounded-2xl border border-zinc-200 bg-white p-6 md:p-8">
        <h1 className="text-3xl font-black tracking-tight text-zinc-950 md:text-4xl">Términos de uso</h1>
        <p className="mt-3 text-sm text-zinc-500">Última actualización: 22 de julio de 2026</p>
        <div className="mt-7 space-y-6 text-sm leading-relaxed text-zinc-700 md:text-base">
          <section><h2 className="text-base font-bold text-zinc-900 md:text-lg">1. Proyecto archivado</h2><p className="mt-2">i18nHub se mantiene como muestra de un Trabajo Fin de Máster. El SaaS no está operativo: no hay registro, inicio de sesión, cuentas, soporte de producto, pagos ni acuerdos de nivel de servicio.</p></section>
          <section><h2 className="text-base font-bold text-zinc-900 md:text-lg">2. Demo</h2><p className="mt-2">La demo se ofrece únicamente con fines informativos y de demostración. Procesa los archivos de forma local en tu navegador; revisa cualquier resultado antes de usarlo en producción y no introduzcas información sensible.</p></section>
          <section><h2 className="text-base font-bold text-zinc-900 md:text-lg">3. Disponibilidad</h2><p className="mt-2">La landing y la demo pueden cambiar, interrumpirse o retirarse sin previo aviso. No garantizamos su disponibilidad continua ni resultados concretos.</p></section>
          <section><h2 className="text-base font-bold text-zinc-900 md:text-lg">4. Propiedad intelectual</h2><p className="mt-2">El código de i18nHub se distribuye bajo licencia GPL-3.0. La marca, diseño y contenido de la web pertenecen a sus respectivos titulares.</p></section>
          <section><h2 className="text-base font-bold text-zinc-900 md:text-lg">5. Contacto y cambios</h2><p className="mt-2">Para cuestiones sobre este proyecto, escribe a <a className="font-medium text-zinc-900 underline" href="mailto:support@byndleapp.com">support@byndleapp.com</a>. Estos términos podrán actualizarse si cambia el estado del proyecto.</p></section>
        </div>
      </div></section>
    </main>
  );
}
