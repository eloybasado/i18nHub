import { useEffect, useRef, useState } from 'react';

const MESSAGES = [
  'Leyendo entre líneas…',
  'Calibrando el tono…',
  'Detectando matices culturales…',
  'Consultando el diccionario universal…',
  'Pensando en 47 idiomas a la vez…',
  'Buscando false friends…',
  'Midiendo la longitud de los textos…',
  'Comprobando que nada se ha perdido en la traducción…',
  'Afinando el registro lingüístico…',
  'Revisando que las variables siguen en su sitio…',
  'Comparando con el idioma de referencia…',
  'Analizando coherencia terminológica…',
];

type Props = {
  visible: boolean;
  minDurationMs?: number;
};

export function AiLoadingOverlay({ visible, minDurationMs = 3000 }: Props) {
  const [isRendered, setIsRendered] = useState(visible);
  const [msgIndex, setMsgIndex] = useState(0);
  const [fade, setFade] = useState(true);
  const visibleSinceRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const msgTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Show/hide logic with min duration
  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (visible) {
      visibleSinceRef.current = Date.now();
      setIsRendered(true);
      return;
    }

    const elapsed = visibleSinceRef.current ? Date.now() - visibleSinceRef.current : minDurationMs;
    const remaining = Math.max(0, minDurationMs - elapsed);

    if (remaining > 0) {
      timerRef.current = setTimeout(() => {
        setIsRendered(false);
        timerRef.current = null;
        visibleSinceRef.current = null;
      }, remaining);
    } else {
      setIsRendered(false);
      visibleSinceRef.current = null;
    }
  }, [visible, minDurationMs]);

  // Rotate messages while rendered
  useEffect(() => {
    if (!isRendered) return;

    setMsgIndex(Math.floor(Math.random() * MESSAGES.length));
    setFade(true);

    msgTimerRef.current = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setMsgIndex((i) => (i + 1) % MESSAGES.length);
        setFade(true);
      }, 400);
    }, 2800);

    return () => {
      if (msgTimerRef.current) clearInterval(msgTimerRef.current);
    };
  }, [isRendered]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (msgTimerRef.current) clearInterval(msgTimerRef.current);
    };
  }, []);

  if (!isRendered) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/95 backdrop-blur-sm">
      {/* Animated dots */}
      <div className="mb-8 flex gap-2">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-2.5 w-2.5 rounded-full bg-violet-500"
            style={{
              animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>

      <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-violet-500">
        IA trabajando
      </p>

      <p
        className="max-w-xs text-center text-xl font-semibold text-zinc-800 transition-opacity duration-300"
        style={{ opacity: fade ? 1 : 0 }}
      >
        {MESSAGES[msgIndex]}
      </p>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); opacity: 0.4; }
          50% { transform: translateY(-10px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
