import { AlertCircle } from 'lucide-react';

export function IntegrationsSection() {
  return (
    <div>
      <div className="mb-6 flex items-center gap-2">
        <h2 className="text-lg font-semibold text-zinc-900">Integraciones</h2>
        <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
          BETA
        </span>
      </div>

      <div className="flex items-start gap-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
        <AlertCircle size={20} className="mt-0.5 flex-shrink-0 text-yellow-700" />
        <div>
          <p className="font-medium text-yellow-900">En desarrollo</p>
          <p className="mt-1 text-sm text-yellow-800">
            Pronto podras configurar proveedores de IA personalizados y conectar repositorios de GitHub para sincronizar
            automaticamente tus archivos de traduccion.
          </p>
        </div>
      </div>

      <div className="mt-8 space-y-4">
        <div>
          <p className="text-sm font-medium text-zinc-700">Proveedor IA personalizado</p>
          <p className="mt-1 text-xs text-zinc-600">Configura tu propia API de IA en lugar de usar Groq</p>
        </div>

        <div>
          <p className="text-sm font-medium text-zinc-700">Integracion GitHub</p>
          <p className="mt-1 text-xs text-zinc-600">Descarga y carga archivos directamente desde repositorios</p>
        </div>
      </div>
    </div>
  );
}
