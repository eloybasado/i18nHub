import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import type { DotLottie } from '@lottiefiles/dotlottie-web';
import { ArrowRight, BrainCircuit, CheckCircle2, FolderKanban, Languages, ShieldCheck } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';

export function LandingPage() {
  const translationFeatureRef = useRef<HTMLElement | null>(null);
  const replayTimeoutRef = useRef<number | null>(null);
  const [playTranslationAnim, setPlayTranslationAnim] = useState(false);
  const [translationPlayer, setTranslationPlayer] = useState<DotLottie | null>(null);

  const clearReplayTimeout = () => {
    if (replayTimeoutRef.current !== null) {
      window.clearTimeout(replayTimeoutRef.current);
      replayTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    const target = translationFeatureRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const firstEntry = entries[0];
        if (firstEntry?.isIntersecting) {
          setPlayTranslationAnim(true);
          observer.disconnect();
        }
      },
      { threshold: 0.4 },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!playTranslationAnim || !translationPlayer) return;

    translationPlayer.setLoop(false);
    clearReplayTimeout();

    const runCycle = () => {
      translationPlayer.stop();
      translationPlayer.play();
    };

    const onLoad = () => {
      runCycle();
    };

    const onComplete = () => {
      clearReplayTimeout();
      replayTimeoutRef.current = window.setTimeout(() => {
        runCycle();
      }, 2000);
    };

    translationPlayer.addEventListener('load', onLoad);
    translationPlayer.addEventListener('complete', onComplete);
    runCycle();

    return () => {
      clearReplayTimeout();
      translationPlayer.removeEventListener('load', onLoad);
      translationPlayer.removeEventListener('complete', onComplete);
    };
  }, [playTranslationAnim, translationPlayer]);

  return (
    <main className="min-h-screen bg-white text-zinc-900">
      <header className="border-b border-zinc-200/90 bg-white/90 shadow-[0_6px_18px_rgba(0,0,0,0.04)] backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-2.5 md:px-6">
          <Link
            to="/"
            className="group inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1 transition-colors hover:bg-zinc-100"
          >
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-zinc-900 text-white">
              <Languages size={13} />
            </span>
            <span className="text-sm font-extrabold tracking-tight text-zinc-950">i18nHub</span>
          </Link>

          <nav className="flex items-center gap-2">
            <Link to="/login">
              <Button
                type="button"
                variant="outline"
                className="border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100"
              >
                Iniciar sesión
              </Button>
            </Link>
            <Link to="/register">
              <Button type="button">Crear cuenta</Button>
            </Link>
          </nav>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-zinc-200/80 bg-[radíal-gradient(circle_at_80%_20%,rgba(24,24,27,0.07),transparent_45%),linear-gradient(180deg,#fff_0%,#fafafa_100%)] md:min-h-[540px]">
        <div className="pointer-events-none absolute inset-y-0 -right-[10vw] hidden w-[84vw] md:block">
          <DotLottieReact
            src="/animations/world-map-scroll.lottie"
            autoplay
            loop
            className="h-full w-full scale-[1.03] opacity-90"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,#fafafa_2%,rgba(250,250,250,0.86)_20%,rgba(250,250,250,0.34)_40%,rgba(250,250,250,0)_60%)]" />
        </div>

        <div className="pointer-events-none absolute inset-x-0 top-0 h-[260px] md:hidden">
          <DotLottieReact
            src="/animations/world-map-scroll.lottie"
            autoplay
            loop
            className="h-full w-full opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-zinc-50/20 via-zinc-50/70 to-zinc-50" />
        </div>

        <div className="relative mx-auto w-full max-w-7xl px-4 py-12 md:px-6 md:py-16">
          <div className="max-w-3xl space-y-6">
            <h1 className="max-w-3xl text-5xl font-black tracking-tight text-zinc-950 md:text-6xl">
              Limpia y valida tus traducciones JSON en minutos
            </h1>
            <p className="max-w-2xl text-lg leading-relaxed text-zinc-600 md:text-xl">
              Empieza con el demo para editar archivos en local y, cuando quieras trabajar en serio, da el salto a una
              cuenta para guardar proyectos, analizar idiomas y colaborar.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <Link to="/demo">
                <Button type="button" className="h-11 px-5 text-sm font-semibold">
                  Probar demo ahora
                  <ArrowRight size={16} />
                </Button>
              </Link>
              <Link to="/register">
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 border-zinc-300 px-5 text-sm font-semibold text-zinc-700 hover:bg-zinc-100"
                >
                  Crear cuenta
                </Button>
              </Link>
            </div>

            <div className="grid gap-2 text-base text-zinc-700 sm:grid-cols-3">
              <div className="inline-flex items-center gap-2 rounded-md border border-zinc-200 bg-white/95 px-3 py-2">
                <CheckCircle2 size={15} className="text-zinc-800" />
                Sin configurar backend
              </div>
              <div className="inline-flex items-center gap-2 rounded-md border border-zinc-200 bg-white/95 px-3 py-2">
                <CheckCircle2 size={15} className="text-zinc-800" />
                Editor visual y RAW
              </div>
              <div className="inline-flex items-center gap-2 rounded-md border border-zinc-200 bg-white/95 px-3 py-2">
                <CheckCircle2 size={15} className="text-zinc-800" />
                Descarga JSON final
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-10 md:px-6 md:py-14">
        <div className="mb-8 max-w-3xl">
          <h2 className="text-3xl font-black tracking-tight text-zinc-950 md:text-4xl">
            Features que si ahorran tiempo
          </h2>
          <p className="mt-3 text-lg text-zinc-600 md:text-xl">
            No es solo un editor bonito. i18nHub te da un flujo claro para cargar, revisar y mejorar traducciones sin
            perder control.
          </p>
        </div>

        <div className="space-y-6">
          <article
            ref={translationFeatureRef}
            className="grid gap-6 rounded-2xl border border-zinc-200 bg-zinc-50 p-5 md:grid-cols-[320px_minmax(0,1fr)] md:items-center md:p-8"
          >
            <div className="grid h-64 place-items-center overflow-hidden md:h-72">
              {playTranslationAnim ? (
                <DotLottieReact
                  src="/animations/translation-icon.lottie"
                  autoplay={false}
                  loop={false}
                  dotLottieRefCallback={(player) => setTranslationPlayer(player)}
                  className="h-64 w-full md:h-72"
                />
              ) : (
                <div className="h-20 w-20 rounded-full border border-zinc-300 bg-zinc-100/80" />
              )}
            </div>
            <div>
              <h3 className="mt-2 text-3xl font-black tracking-tight text-zinc-950">
                Validacion de traducciones con foco técnico
              </h3>
              <p className="mt-3 text-lg text-zinc-600">
                Detecta inconsistencias entre idiomas y revisa contenido clave sin navegar entre mil archivos.
              </p>
              <div className="mt-4 flex flex-wrap gap-3 text-base text-zinc-700">
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 size={15} />
                  Comparacion por idioma
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 size={15} />
                  Interpolaciones controladas
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 size={15} />
                  Menos errores en release
                </span>
              </div>
            </div>
          </article>

          <article className="grid gap-6 rounded-2xl border border-zinc-900 bg-zinc-900 p-5 text-zinc-100 md:grid-cols-[minmax(0,1fr)_360px] md:items-center md:p-8">
            <div>
              <h3 className="mt-2 text-3xl font-black tracking-tight">Carga de archivos y flujo de trabajo continuo</h3>
              <p className="mt-3 text-lg text-zinc-300">
                Sube archivos, edita en visual o RAW y descarga resultados sin romper la estructura de tu proyecto
                frontend.
              </p>
              <ul className="mt-5 space-y-3 text-lg leading-relaxed text-zinc-100">
                <li className="flex items-start gap-3">
                  <FolderKanban size={18} className="mt-0.5 shrink-0" />
                  <span>Proyectos persistentes para equipos</span>
                </li>
                <li className="flex items-start gap-3">
                  <ShieldCheck size={18} className="mt-0.5 shrink-0" />
                  <span>Análisis de keys faltantes y sobrantes</span>
                </li>
                <li className="flex items-start gap-3">
                  <BrainCircuit size={18} className="mt-0.5 shrink-0" />
                  <span>Sugerencias IA e historial en PRO</span>
                </li>
              </ul>
              <div className="mt-5">
                <Link to="/register">
                  <Button type="button" className="h-10 bg-white text-zinc-900 hover:bg-zinc-200">
                    Crear cuenta gratis
                  </Button>
                </Link>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl">
              <DotLottieReact
                src="/animations/upload-files-loader.lottie"
                autoplay
                loop
                className="h-64 w-full md:h-72"
              />
            </div>
          </article>
        </div>
      </section>

      <footer className="border-t border-zinc-200 bg-zinc-50/80">
        <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-8 text-sm text-zinc-600 md:grid-cols-3 md:px-6">
          <div>
            <p className="text-base font-bold tracking-tight text-zinc-900">i18nHub</p>
            <p className="mt-2 max-w-sm">
              Gestión de traducciones JSON para equipos frontend con enfoque simple y productivo.
            </p>
          </div>

          <div>
            <p className="font-semibold uppercase tracking-[0.1em] text-zinc-500">Enlaces</p>
            <div className="mt-2 flex flex-col gap-1.5">
              <Link to="/demo" className="hover:text-zinc-900 hover:underline">
                Probar demo
              </Link>
              <Link to="/register" className="hover:text-zinc-900 hover:underline">
                Crear cuenta
              </Link>
              <Link to="/login" className="hover:text-zinc-900 hover:underline">
                Iniciar sesión
              </Link>
            </div>
          </div>

          <div>
            <p className="font-semibold uppercase tracking-[0.1em] text-zinc-500">Legal</p>
            <div className="mt-2 flex flex-col gap-1.5">
              <a href="#" className="hover:text-zinc-900 hover:underline">
                Política de privacidad
              </a>
              <a href="#" className="hover:text-zinc-900 hover:underline">
                Términos de uso
              </a>
              <p className="pt-1 text-zinc-500">Copyright 2026 i18nHub. All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
