import { Link } from 'react-router-dom';
import { PublicHeader } from '../components/common/PublicHeader';

export function TermsOfUsePage() {
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
          <h1 className="text-3xl font-black tracking-tight text-zinc-950 md:text-4xl">Términos de uso</h1>
          <p className="mt-3 text-sm text-zinc-500">Última actualización: 8 de mayo de 2026</p>

          <div className="mt-7 space-y-6 text-sm leading-relaxed text-zinc-700 md:text-base">
            <section>
              <h2 className="text-base font-bold text-zinc-900 md:text-lg">1. Qué es i18nHub</h2>
              <p className="mt-2">
                i18nHub es una herramienta para gestionar y revisar traducciones JSON. Este despliegue forma parte de un
                proyecto académico (TFM) y está en evolución.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-zinc-900 md:text-lg">2. Uso del servicio</h2>
              <p className="mt-2">
                Al usar la app aceptas estos términos. Debes usarla de forma legal y sin intentar romper su
                funcionamiento o acceder a datos de otros usuarios.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-zinc-900 md:text-lg">3. Cuenta y credenciales</h2>
              <p className="mt-2">
                Eres responsable de mantener tus credenciales seguras y de la actividad que se realice con tu cuenta.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-zinc-900 md:text-lg">4. Datos y contenido que subes</h2>
              <p className="mt-2">
                Los archivos y textos que subes son tu responsabilidad. Asegúrate de tener derechos para usarlos y de no
                incluir datos sensibles si no es necesario.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-zinc-900 md:text-lg">5. Disponibilidad y cambios</h2>
              <p className="mt-2">
                No garantizamos disponibilidad continua. El servicio puede tener cortes, cambios de funcionalidad o
                interrupciones temporales, incluso sin aviso previo.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-zinc-900 md:text-lg">6. Responsabilidad</h2>
              <p className="mt-2">
                i18nHub es una herramienta de apoyo. Debes revisar y validar los resultados antes de usarlos en
                producción.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-zinc-900 md:text-lg">7. Licencia del código</h2>
              <p className="mt-2">
                El código de i18nHub es open source bajo licencia GPL-3.0. El uso, copia y modificación del código se
                rigen por dicha licencia.
              </p>
            </section>

            <section>
              <h2 className="text-base font-bold text-zinc-900 md:text-lg">8. Actualizaciones de estos términos</h2>
              <p className="mt-2">
                Podemos actualizar este documento para reflejar cambios del proyecto o requisitos legales. La fecha de
                actualización aparecerá siempre en esta página.
              </p>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
