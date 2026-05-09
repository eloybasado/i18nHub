import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import type { DotLottie } from '@lottiefiles/dotlottie-web';
import {
  ArrowRight,
  BookOpen,
  BrainCircuit,
  CalendarClock,
  CheckCircle2,
  ExternalLink,
  Eye,
  FileCode,
  Github,
  Languages,
  ListChecks,
  Milestone,
  RotateCcw,
  Sparkles,
  Target,
  Users,
  Workflow,
} from 'lucide-react';
import { useEffect, useRef, useState, type ComponentType } from 'react';
import { Link } from 'react-router-dom';
import { PublicHeader } from '../components/common/PublicHeader';
import { FeatureCard, StepCard } from '../components/landing/LandingCards';
import { Button } from '../components/ui/button';

type LandingCardItem = {
  icon: ComponentType<{ size?: number; className?: string }>;
  title: string;
  description: string;
  eyebrow?: string;
};

const AI_FEATURE_CARDS: LandingCardItem[] = [
  {
    icon: Sparkles,
    title: 'Sugerencias contextuales',
    description: 'Genera propuestas sobre missing keys e inconsistencias sin salir del flujo de edición.',
  },
  {
    icon: Workflow,
    title: 'Diccionario + contexto IA',
    description: 'Define términos y notas por idioma para mantener consistencia de marca en todo el producto.',
  },
  {
    icon: ListChecks,
    title: 'Revisión aplicable',
    description: 'Selecciona qué sugerencias aplicar y mantén control manual antes de guardar cambios.',
  },
];

const I18N_EDUCATION_CARDS: LandingCardItem[] = [
  {
    icon: Languages,
    title: 'i18n',
    description: 'Internacionalización: dejar la app preparada para múltiples idiomas y reglas regionales.',
  },
  {
    icon: Workflow,
    title: 'l10n',
    description: 'Localización: adaptar idioma, tono y convenciones para cada mercado o comunidad.',
  },
  {
    icon: BookOpen,
    title: 'Qué suele fallar',
    description: 'Keys faltantes, interpolaciones inconsistentes y textos sobrantes son errores típicos en frontend.',
  },
];

const ROADMAP_POST_TFM_CARDS: LandingCardItem[] = [
  {
    icon: Milestone,
    eyebrow: 'Post-TFM · fase 1',
    title: 'Base de producto',
    description: 'CI/CD, hardening del backend y observabilidad para un entorno más robusto y mantenible.',
  },
  {
    icon: CalendarClock,
    eyebrow: 'Post-TFM · fase 2',
    title: 'Escalado funcional',
    description: 'Mejor experiencia colaborativa, paneles de calidad por idioma e historial más avanzado.',
  },
  {
    icon: Target,
    eyebrow: 'Post-TFM · fase 3',
    title: 'Modelo de producto',
    description: 'Plan PRO y roadmap público para evolución abierta del proyecto.',
  },
];

const GETTING_STARTED_STEPS = [
  {
    step: 'Paso 1',
    title: 'Prueba la demo',
    description: 'Sube un JSON y edita en modo visual/RAW sin registro.',
  },
  {
    step: 'Paso 2',
    title: 'Crea proyecto',
    description: 'Carga idiomas, ejecuta análisis y revisa issues detectados.',
  },
  {
    step: 'Paso 3',
    title: 'Escala con IA',
    description: 'Aplica sugerencias y exporta JSON/ZIP con confianza.',
  },
];

export function LandingPage() {
  const githubRepoUrl = 'https://github.com/eloybasado/i18nHub';
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
      <PublicHeader
        className="bg-white/90 shadow-[0_6px_18px_rgba(0,0,0,0.04)] backdrop-blur"
        rightSlot={
          <>
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
          </>
        }
      />

      <section className="relative overflow-hidden border-b border-zinc-200/80 bg-[radial-gradient(circle_at_80%_20%,rgba(24,24,27,0.07),transparent_45%),linear-gradient(180deg,#fff_0%,#fafafa_100%)] md:min-h-[540px]">
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
              Empieza con la demo para editar archivos en local y, cuando quieras trabajar en serio, da el salto a una
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
              <div className="inline-flex items-center gap-3 rounded-md border border-zinc-200 bg-white/95 px-4 py-3">
                <ListChecks size={22} className="text-zinc-800 shrink-0" />
                Análisis automático de keys
              </div>
              <div className="inline-flex items-center gap-3 rounded-md border border-zinc-200 bg-white/95 px-4 py-3">
                <CalendarClock size={22} className="text-zinc-800 shrink-0" />
                Historial de versiones (PRO)
              </div>
              <div className="inline-flex items-center gap-3 rounded-md border border-zinc-200 bg-white/95 px-4 py-3">
                <Users size={22} className="text-zinc-800 shrink-0" />
                Gestión de equipos por rol
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
                Control de calidad en traducciones
              </h3>
              <p className="mt-3 text-lg text-zinc-600">
                Análisis automático para detectar inconsistencias entre idiomas, keys faltantes y problemas de
                interpolación.
              </p>
              <div className="mt-4 flex flex-wrap gap-3 text-base text-zinc-700">
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 size={15} />
                  Detecta keys faltantes
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 size={15} />
                  Interpolaciones consistentes
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 size={15} />
                  Panel de issues por idioma
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
                  <Users size={18} className="mt-0.5 shrink-0" />
                  <span>Gestión de equipos y permisos por rol</span>
                </li>
                <li className="flex items-start gap-3">
                  <FileCode size={18} className="mt-0.5 shrink-0" />
                  <span>Tres modos de edición: visual, RAW y árbol</span>
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

      <section className="mx-auto w-full max-w-7xl px-4 py-10 md:px-6 md:py-14">
        <div className="mb-8 max-w-3xl">
          <h2 className="text-3xl font-black tracking-tight text-zinc-950 md:text-4xl">
            Editor de árbol para estructuras complejas
          </h2>
          <p className="mt-3 text-lg text-zinc-600 md:text-xl">
            Más allá de visual y RAW. Edita tus JSONs en forma de árbol jerárquico para ver exactamente dónde va cada
            traducción sin perder contexto de la estructura.
          </p>
        </div>

        <article className="grid gap-6 rounded-2xl border border-zinc-200 bg-white p-5 md:grid-cols-[minmax(0,1fr)_340px] md:items-center md:p-8">
          <div>
            <h3 className="text-2xl font-black tracking-tight text-zinc-950">Visualiza la jerarquía de tus datos</h3>
            <p className="mt-3 text-lg text-zinc-600">
              En lugar de ver el JSON plano o fila por fila, el modo árbol te muestra la estructura completa de forma
              navegable. Ideal para proyectos con JSONs profundos.
            </p>
            <ul className="mt-5 space-y-3 text-base text-zinc-700">
              <li className="flex items-start gap-3">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                <span>Expande y contrae secciones según necesites</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                <span>Edita valores directamente sin dejar la vista</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                <span>Acceso rápido a cualquier nivel de anidación</span>
              </li>
            </ul>
          </div>

          <div className="overflow-hidden rounded-xl">
            <DotLottieReact src="/animations/data.lottie" autoplay loop className="h-64 w-full md:h-72" />
          </div>
        </article>
      </section>

      <section className="border-y border-zinc-200 bg-zinc-50/70">
        <div className="mx-auto w-full max-w-7xl px-4 py-10 md:px-6 md:py-14">
          <div className="mb-8 max-w-3xl">
            <h2 className="text-3xl font-black tracking-tight text-zinc-950 md:text-4xl">
              Historial de versiones <span className="text-sm text-zinc-500">PRO</span>
            </h2>
            <p className="mt-3 text-lg text-zinc-600 md:text-xl">
              Cada cambio queda guardado automáticamente. Previsualiza versiones anteriores o restaura si algo salió
              mal, todo sin perder tiempo buscando backups.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <article className="rounded-2xl border border-zinc-200 bg-white p-6">
              <div className="flex items-start gap-3">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                  <Eye size={18} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-zinc-900">Previsualiza sin restaurar</h3>
                  <p className="mt-2 text-sm text-zinc-600">
                    Ve exactamente qué contenido había en cualquier versión anterior sin sobrescribir tu trabajo actual.
                  </p>
                </div>
              </div>
            </article>

            <article className="rounded-2xl border border-zinc-200 bg-white p-6">
              <div className="flex items-start gap-3">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-700">
                  <RotateCcw size={18} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-zinc-900">Restaura en un click</h3>
                  <p className="mt-2 text-sm text-zinc-600">
                    Revierte cambios accidentales restaurando cualquier versión anterior al instante.
                  </p>
                </div>
              </div>
            </article>

            <article className="rounded-2xl border border-zinc-200 bg-white p-6">
              <div className="flex items-start gap-3">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-700">
                  <CalendarClock size={18} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-zinc-900">Historial automático</h3>
                  <p className="mt-2 text-sm text-zinc-600">
                    Se crea un snapshot antes de cada cambio. Sin configuración, todo se guarda por defecto.
                  </p>
                </div>
              </div>
            </article>

            <article className="rounded-2xl border border-zinc-200 bg-white p-6">
              <div className="flex items-start gap-3">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                  <Users size={18} />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-zinc-900">Quién hizo qué</h3>
                  <p className="mt-2 text-sm text-zinc-600">
                    Cada versión registra quién la creó y cuándo, ideal para auditoría y responsabilidad en equipo.
                  </p>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="border-y border-zinc-200 bg-zinc-50/80">
        <div className="mx-auto w-full max-w-7xl px-4 py-10 md:px-6 md:py-14">
          <div className="mb-8 max-w-3xl">
            <h2 className="text-3xl font-black tracking-tight text-zinc-950 md:text-4xl">
              IA útil para localización real <span className="text-sm text-zinc-500">PRO</span>
            </h2>
            <p className="mt-3 text-lg text-zinc-600 md:text-xl">
              i18nHub integra IA de forma práctica: no para reemplazar al equipo, sino para acelerar revisiones y
              propuestas con contexto de proyecto.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {AI_FEATURE_CARDS.map((card) => (
              <FeatureCard key={card.title} icon={card.icon} title={card.title} description={card.description} />
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-10 md:px-6 md:py-14">
        <div className="grid gap-10 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-black tracking-tight text-zinc-950 md:text-4xl">¿Qué es este TFM?</h2>
            <p className="mt-3 text-lg text-zinc-600">
              i18nHub nace como Trabajo Fin de Máster orientado a resolver un problema común en equipos frontend:
              gestionar traducciones JSON de forma rápida, fiable y sin depender de plataformas costosas.
            </p>

            <div className="mt-7 space-y-4">
              <article className="flex items-start gap-4">
                <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-900">
                  <FileCode size={22} />
                </div>
                <div>
                  <h3 className="text-base font-bold tracking-tight text-zinc-900">Enfoque técnico</h3>
                  <p className="mt-1 text-sm text-zinc-600">
                    React + NestJS + Prisma para un stack moderno, mantenible y fácil de presentar.
                  </p>
                </div>
              </article>

              <article className="flex items-start gap-4">
                <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-900">
                  <BrainCircuit size={22} />
                </div>
                <div>
                  <h3 className="text-base font-bold tracking-tight text-zinc-900">IA aplicada</h3>
                  <p className="mt-1 text-sm text-zinc-600">
                    Sugerencias asistidas con control humano para mejorar productividad sin perder calidad lingüística.
                  </p>
                </div>
              </article>
            </div>
          </div>

          <img src="/logo.svg" alt="i18nHub" className="logo-float-hover h-56 w-56 object-contain md:h-72 md:w-72" />
        </div>
      </section>

      <section className="border-y border-zinc-200 bg-zinc-50/70">
        <div className="mx-auto w-full max-w-7xl px-4 py-10 md:px-6 md:py-14">
          <div className="mb-8 max-w-3xl">
            <h2 className="text-3xl font-black tracking-tight text-zinc-950 md:text-4xl">
              i18n y localización, en claro
            </h2>
            <p className="mt-3 text-lg text-zinc-600 md:text-xl">
              i18n no es solo traducir texto: es diseñar una experiencia global desde el código, el formato y el
              contexto cultural.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {I18N_EDUCATION_CARDS.map((card) => (
              <FeatureCard key={card.title} icon={card.icon} title={card.title} description={card.description} />
            ))}
          </div>

          <div className="mt-7 grid gap-4 md:grid-cols-[240px_minmax(0,1fr)]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.1em] text-zinc-500">Recursos oficiales</p>
              <p className="mt-2 text-sm leading-relaxed text-zinc-600">
                Referencias fiables para entender estándares de internacionalización y aplicar buenas prácticas en
                frontend.
              </p>
            </div>

            <ul className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-zinc-200/80">
              <li className="border-b border-zinc-200">
                <a
                  href="https://www.w3.org/International/"
                  target="_blank"
                  rel="noreferrer"
                  className="group flex items-start justify-between gap-3 px-4 py-3 transition-colors hover:bg-zinc-50"
                >
                  <span>
                    <span className="block text-sm font-semibold text-zinc-900">W3C Internationalization</span>
                    <span className="mt-0.5 block text-xs text-zinc-600">
                      Guías base de i18n para web (idiomas, bidireccionalidad, formatos y accesibilidad cultural).
                    </span>
                  </span>
                  <ExternalLink size={14} className="mt-0.5 shrink-0 text-zinc-400 group-hover:text-zinc-700" />
                </a>
              </li>

              <li className="border-b border-zinc-200">
                <a
                  href="https://cldr.unicode.org/"
                  target="_blank"
                  rel="noreferrer"
                  className="group flex items-start justify-between gap-3 px-4 py-3 transition-colors hover:bg-zinc-50"
                >
                  <span>
                    <span className="block text-sm font-semibold text-zinc-900">Unicode CLDR</span>
                    <span className="mt-0.5 block text-xs text-zinc-600">
                      Datos oficiales de locales para pluralización, números, monedas y fechas.
                    </span>
                  </span>
                  <ExternalLink size={14} className="mt-0.5 shrink-0 text-zinc-400 group-hover:text-zinc-700" />
                </a>
              </li>

              <li>
                <a
                  href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl"
                  target="_blank"
                  rel="noreferrer"
                  className="group flex items-start justify-between gap-3 px-4 py-3 transition-colors hover:bg-zinc-50"
                >
                  <span>
                    <span className="block text-sm font-semibold text-zinc-900">MDN Intl API</span>
                    <span className="mt-0.5 block text-xs text-zinc-600">
                      Documentación práctica de JavaScript Intl para implementar formatos locales correctamente.
                    </span>
                  </span>
                  <ExternalLink size={14} className="mt-0.5 shrink-0 text-zinc-400 group-hover:text-zinc-700" />
                </a>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-10 md:px-6 md:py-14">
        <div className="rounded-2xl bg-zinc-900 p-6 text-zinc-100 md:p-8">
          <h2 className="text-3xl font-black tracking-tight md:text-4xl">How to get started</h2>
          <p className="mt-3 max-w-3xl text-lg text-zinc-300">
            En menos de 10 minutos puedes probar el flujo completo, entender el valor de i18nHub y decidir si encaja
            para tu equipo.
          </p>

          <ol className="mt-6 grid gap-3 md:grid-cols-3">
            {GETTING_STARTED_STEPS.map((step) => (
              <StepCard key={step.step} step={step.step} title={step.title} description={step.description} />
            ))}
          </ol>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link to="/demo">
              <Button type="button" className="h-10 bg-white text-zinc-900 hover:bg-zinc-200">
                Abrir demo
              </Button>
            </Link>

            <Link to="/register">
              <Button
                type="button"
                variant="outline"
                className="h-10 border-zinc-500 bg-transparent text-zinc-100 hover:bg-zinc-800"
              >
                Crear cuenta
              </Button>
            </Link>

            <a
              href={githubRepoUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center gap-2 rounded-md border border-zinc-500 px-4 text-sm font-medium text-zinc-100 transition-colors hover:bg-zinc-800"
            >
              <Github size={16} />
              Ver repositorio en GitHub
            </a>
          </div>
        </div>
      </section>

      <section className="border-y border-zinc-200 bg-zinc-50/70">
        <div className="mx-auto w-full max-w-7xl px-4 py-10 md:px-6 md:py-14">
          <div className="mb-8 max-w-3xl">
            <h2 className="text-3xl font-black tracking-tight text-zinc-950 md:text-4xl">Roadmap post-TFM</h2>
            <p className="mt-3 text-lg text-zinc-600 md:text-xl">
              Líneas de evolución planteadas para la fase posterior a la defensa del TFM.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {ROADMAP_POST_TFM_CARDS.map((card) => (
              <FeatureCard
                key={card.title}
                icon={card.icon}
                title={card.title}
                description={card.description}
                eyebrow={card.eyebrow}
              />
            ))}
          </div>
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
              <a href={githubRepoUrl} target="_blank" rel="noreferrer" className="hover:text-zinc-900 hover:underline">
                Repositorio GitHub
              </a>
            </div>
          </div>

          <div>
            <p className="font-semibold uppercase tracking-[0.1em] text-zinc-500">Legal</p>
            <div className="mt-2 flex flex-col gap-1.5">
              <Link to="/privacy-policy" className="hover:text-zinc-900 hover:underline">
                Política de privacidad
              </Link>
              <Link to="/terms-of-use" className="hover:text-zinc-900 hover:underline">
                Términos de uso
              </Link>
              <p className="pt-1 text-zinc-500">© 2026 i18nHub. All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
