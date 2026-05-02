import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { useEffect, useRef, useState } from 'react';

type LoadingLottieOverlayProps = {
  visible: boolean;
  src: string;
  minDurationMs?: number;
  backdropClassName?: string;
  animationClassName?: string;
};

export function LoadingLottieOverlay({
  visible,
  src,
  minDurationMs = 3000,
  backdropClassName = 'bg-black/40',
  animationClassName = 'h-48 w-48 max-w-[50vw] max-h-[50vh] object-contain',
}: LoadingLottieOverlayProps) {
  const [isRendered, setIsRendered] = useState(visible);
  const visibleSinceRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);

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

    const startTime = visibleSinceRef.current;
    const elapsed = startTime ? Date.now() - startTime : minDurationMs;
    const remaining = Math.max(0, minDurationMs - elapsed);

    if (remaining > 0) {
      timerRef.current = window.setTimeout(() => {
        setIsRendered(false);
        timerRef.current = null;
        visibleSinceRef.current = null;
      }, remaining);
      return;
    }

    setIsRendered(false);
    visibleSinceRef.current = null;
  }, [visible, minDurationMs]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  if (!isRendered) {
    return null;
  }

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${backdropClassName}`}>
      <DotLottieReact src={src} loop autoplay className={animationClassName} />
    </div>
  );
}
