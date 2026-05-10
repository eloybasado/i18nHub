import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { Button } from '../ui/button';

type AnalysisClearScreenProps = {
  isPro: boolean;
  onViewQualityAnalysis?: () => void;
};

export function AnalysisClearScreen({ isPro, onViewQualityAnalysis }: AnalysisClearScreenProps) {
  return (
    <div className="mt-8 space-y-2">
      <div className="flex justify-center">
        <div className="w-80">
          <DotLottieReact src="/animations/all-good-cat.lottie" loop autoplay />
        </div>
      </div>

      <div className="text-center">
        <h3 className="text-2xl font-semibold text-zinc-900">¡Todo está bien!</h3>
        <p className="mt-2 text-sm text-zinc-600">
          No se encontraron issues en tu análisis. Todas las traducciones están en orden.
        </p>
      </div>

      {!isPro ? (
        <div className="mx-auto max-w-sm space-y-3 text-center">
          <p className="text-sm text-zinc-700">
            ¿Quizá es momento de mejorar la <span className="font-semibold">calidad</span> de tus traducciones?
          </p>
          <p className="text-xs text-zinc-600">
            Con análisis de calidad PRO, detecta tonalidad inconsistente, longitud de strings, y más.
          </p>
          <Button type="button" variant="outline" size="sm" className="w-full" onClick={onViewQualityAnalysis}>
            Conocer PRO
          </Button>
        </div>
      ) : (
        <div className="mx-auto max-w-sm space-y-3 text-center">
          <p className="text-sm font-semibold text-zinc-900">Tienes acceso a análisis de calidad PRO</p>
          <p className="text-xs text-zinc-600">
            Ejecuta un análisis de calidad para detectar problemas de tonalidad, consistencia de términos, y más.
          </p>
          {onViewQualityAnalysis && (
            <Button
              type="button"
              size="sm"
              className="w-full bg-zinc-900 text-white hover:bg-zinc-800"
              onClick={onViewQualityAnalysis}
            >
              Ir a análisis de calidad
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
