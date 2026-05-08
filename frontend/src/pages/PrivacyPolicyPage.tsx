import { Link } from 'react-router-dom';
import { PublicHeader } from '../components/common/PublicHeader';

export function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900">
      <PublicHeader
        className="bg-white"
        brandTo="/"
        rightSlot={
          <Link to="/" className="text-sm font-medium text-zinc-600 hover:text-zinc-900">
            Volver al inicio
          </Link>
        }
      />

      <section className="mx-auto w-full max-w-4xl px-4 py-8 md:px-6 md:py-10">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 md:p-8">
          <h1 className="text-3xl font-black tracking-tight text-zinc-950 md:text-4xl">Política de privacidad</h1>
          <p className="mt-3 text-sm text-zinc-500">Última actualización: 8 de mayo de 2026</p>

          <div className="mt-7 space-y-6 text-sm leading-relaxed text-zinc-700 md:text-base">
            <section>
              <h2 className="text-base font-bold text-zinc-900 md:text-lg">1. Qué datos recogemos</h2>
              <p className="mt-2">Cuando creas cuenta o usas la app, tratamos estos datos:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>Nombre y email.</li>
                <li>Contraseña hasheada (nunca guardamos tu contraseña en texto plano).</li>
                <li>Datos técnicos de sesión y autenticación.</li>
                <li>Archivos JSON y contenido que subes para gestionar tus proyectos.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-bold text-zinc-900 md:text-lg">2. Para qué usamos esos datos</h2>
              <p className="mt-2">Usamos tus datos para:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>Autenticación y seguridad de la cuenta.</li>
                <li>Gestión de proyectos y traducciones dentro de i18nHub.</li>
                <li>Mantenimiento técnico básico del servicio.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-bold text-zinc-900 md:text-lg">3. Compartición con terceros</h2>
              <p className="mt-2">
                No vendemos ni cedemos tus datos personales a terceros para fines comerciales. Solo pueden intervenir
                proveedores de infraestructura necesarios para operar el servicio.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-zinc-900 md:text-lg">4. Dónde se alojan los datos</h2>
              <p className="mt-2">
                i18nHub se despliega en Railway. Según la región de despliegue, los datos pueden alojarse en la Unión
                Europea o fuera de ella.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-zinc-900 md:text-lg">5. Conservación y borrado</h2>
              <p className="mt-2">
                Conservamos los datos mientras tu cuenta esté activa o mientras sean necesarios para operar el servicio.
                Puedes solicitar la eliminación de tu cuenta y de tus datos.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-zinc-900 md:text-lg">6. RGPD y derechos</h2>
              <p className="mt-2">
                Si resides en la UE, puedes ejercer tus derechos de acceso, rectificación, supresión, oposición,
                limitación y portabilidad según el RGPD.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-zinc-900 md:text-lg">7. Contacto para privacidad</h2>
              <p className="mt-2">
                Para ejercer derechos o hacer consultas de privacidad, escribe a eparedesmu@uoc.edu.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-zinc-900 md:text-lg">8. Cambios en esta política</h2>
              <p className="mt-2">
                Podemos actualizar este texto para reflejar cambios legales o técnicos del proyecto. La fecha de
                actualización se mostrará en esta página.
              </p>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
