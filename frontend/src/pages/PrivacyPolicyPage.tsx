import { Link } from 'react-router-dom';
import { PublicHeader } from '../components/common/PublicHeader';

export function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900">
      <PublicHeader className="bg-white" brandTo="/" rightSlot={<Link to="/" className="text-sm font-medium text-zinc-600 hover:text-zinc-900">Volver al inicio</Link>} />
      <section className="mx-auto w-full max-w-4xl px-4 py-8 md:px-6 md:py-10">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 md:p-8">
          <h1 className="text-3xl font-black tracking-tight text-zinc-950 md:text-4xl">Política de privacidad</h1>
          <p className="mt-3 text-sm text-zinc-500">Última actualización: 22 de julio de 2026</p>
          <div className="mt-7 space-y-6 text-sm leading-relaxed text-zinc-700 md:text-base">
            <section><h2 className="text-base font-bold text-zinc-900 md:text-lg">1. Estado del proyecto</h2><p className="mt-2">i18nHub fue un proyecto académico de fin de máster y su SaaS está archivado. No se aceptan nuevas cuentas, no se permite iniciar sesión y no se presta el servicio de gestión de traducciones.</p></section>
            <section><h2 className="text-base font-bold text-zinc-900 md:text-lg">2. Responsable</h2><p className="mt-2">El responsable de esta web es Eloy Paredes Muñiz, establecido en España. Para cualquier consulta de privacidad, escribe a <a className="font-medium text-zinc-900 underline" href="mailto:support@byndleapp.com">support@byndleapp.com</a>.</p></section>
            <section><h2 className="text-base font-bold text-zinc-900 md:text-lg">3. Datos que tratamos</h2><p className="mt-2">La demo funciona localmente en tu navegador y no envía los archivos que uses a servidores de i18nHub. La landing no solicita formularios, cuentas ni credenciales. Si nos escribes por correo, trataremos los datos que incluyas para responderte.</p></section>
            <section><h2 className="text-base font-bold text-zinc-900 md:text-lg">4. Hosting y terceros</h2><p className="mt-2">La web se aloja en Vercel, que puede procesar datos técnicos mínimos, como dirección IP y registros de solicitudes, para entregar y proteger el sitio. No usamos analítica, publicidad ni cookies no esenciales.</p></section>
            <section><h2 className="text-base font-bold text-zinc-900 md:text-lg">5. Base jurídica y conservación</h2><p className="mt-2">El tratamiento técnico de la web se basa en nuestro interés legítimo en ofrecerla de forma segura. Los correos se tratan para atender tu consulta y se conservan solo mientras sean necesarios para ello. Si tuviste una cuenta en una versión anterior del proyecto, puedes solicitar información o eliminación escribiendo al contacto anterior.</p></section>
            <section><h2 className="text-base font-bold text-zinc-900 md:text-lg">6. Tus derechos</h2><p className="mt-2">Puedes solicitar acceso, rectificación, supresión, oposición, limitación o portabilidad cuando proceda, así como reclamar ante la Agencia Española de Protección de Datos.</p></section>
            <section><h2 className="text-base font-bold text-zinc-900 md:text-lg">7. Cambios</h2><p className="mt-2">Actualizaremos esta página si cambia el estado del proyecto o el tratamiento de datos.</p></section>
          </div>
        </div>
      </section>
    </main>
  );
}
