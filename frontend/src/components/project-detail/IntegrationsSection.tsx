import { Check, Copy, Key, Loader2, Plus, Trash2, Zap } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { API_URL, apiRequest } from '../../lib/api';
import type { CreateDeliveryKeyResponse, DeliveryApiKey } from '../../lib/types';

type Props = {
  projectId: string;
};

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const copy = () => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <button
      onClick={copy}
      className="flex items-center gap-1 rounded px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700"
    >
      {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
      {copied ? 'Copiado' : 'Copiar'}
    </button>
  );
}

function NewKeyModal({
  apiKey,
  onClose,
}: {
  apiKey: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl border border-zinc-200 bg-white p-6 shadow-xl">
        <div className="mb-1 flex items-center gap-2 text-green-600">
          <Key size={18} />
          <span className="font-semibold">Clave creada</span>
        </div>
        <p className="mb-4 text-sm text-zinc-600">
          Copia esta clave ahora. No podrás volver a verla.
        </p>
        <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
          <code className="flex-1 break-all font-mono text-sm text-zinc-800">
            {apiKey}
          </code>
          <CopyButton text={apiKey} />
        </div>
        <button
          onClick={onClose}
          className="mt-4 w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700"
        >
          Entendido, ya la guardé
        </button>
      </div>
    </div>
  );
}

export function IntegrationsSection({ projectId }: Props) {
  const [keys, setKeys] = useState<DeliveryApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await apiRequest<DeliveryApiKey[]>(
        `/projects/${projectId}/delivery-keys`,
        { auth: true },
      );
      setKeys(data);
    } catch {
      // ignore if tab not active
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  const createKey = async () => {
    if (!newKeyName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await apiRequest<CreateDeliveryKeyResponse>(
        `/projects/${projectId}/delivery-keys`,
        { method: 'POST', auth: true, body: { name: newKeyName.trim() } },
      );
      setCreatedKey(res.key);
      setKeys((prev) => [...prev, res.record]);
      setNewKeyName('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al crear la clave');
    } finally {
      setCreating(false);
    }
  };

  const revokeKey = async (keyId: string) => {
    setRevoking(keyId);
    try {
      await apiRequest(`/projects/${projectId}/delivery-keys/${keyId}`, {
        method: 'DELETE',
        auth: true,
      });
      setKeys((prev) => prev.filter((k) => k.id !== keyId));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al revocar la clave');
    } finally {
      setRevoking(null);
    }
  };

  const exampleUrl = `${API_URL}/delivery/<api-key>/es`;
  const exampleSnippet = `// Fetch translations at runtime
const res = await fetch('${API_URL}/delivery/<api-key>/es');
const translations = await res.json();`;

  return (
    <div>
      <div className="mb-6 flex items-center gap-2">
        <h2 className="text-lg font-semibold text-zinc-900">Integraciones</h2>
        <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
          BETA
        </span>
      </div>

      {/* Delivery API section */}
      <div className="rounded-xl border border-zinc-200 bg-white">
        <div className="flex items-center gap-3 border-b border-zinc-100 px-5 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100">
            <Zap size={16} className="text-violet-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-900">Delivery API</p>
            <p className="text-xs text-zinc-500">
              Sirve tus traducciones en runtime a cualquier app frontend
            </p>
          </div>
        </div>

        <div className="space-y-6 px-5 py-5">
          {/* How to use */}
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-400">
              Cómo usarlo
            </p>
            <div className="rounded-lg border border-zinc-200 bg-zinc-950 px-4 py-3">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[11px] text-zinc-500">JavaScript</span>
                <CopyButton text={exampleSnippet} />
              </div>
              <pre className="overflow-x-auto font-mono text-xs text-zinc-200">
                {exampleSnippet}
              </pre>
            </div>
            <p className="mt-2 text-xs text-zinc-500">
              También disponible por file group:{' '}
              <code className="rounded bg-zinc-100 px-1 py-0.5 text-[11px]">
                {exampleUrl}/default
              </code>
            </p>
          </div>

          {/* Create key */}
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-400">
              Nueva clave
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void createKey();
                }}
                placeholder="Nombre de la clave (p.ej. producción)"
                className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
                maxLength={50}
              />
              <button
                onClick={() => void createKey()}
                disabled={creating || !newKeyName.trim()}
                className="flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-40"
              >
                {creating ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Plus size={14} />
                )}
                Crear
              </button>
            </div>
            {error && (
              <p className="mt-1.5 text-xs text-red-600">{error}</p>
            )}
          </div>

          {/* Keys list */}
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-400">
              Claves activas
            </p>
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-zinc-400">
                <Loader2 size={14} className="animate-spin" />
                Cargando…
              </div>
            ) : keys.length === 0 ? (
              <p className="text-sm text-zinc-400">
                No hay claves. Crea una para empezar.
              </p>
            ) : (
              <ul className="divide-y divide-zinc-100 rounded-lg border border-zinc-200">
                {keys.map((k) => (
                  <li
                    key={k.id}
                    className="flex items-center justify-between px-4 py-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Key size={13} className="flex-shrink-0 text-zinc-400" />
                        <span className="truncate text-sm font-medium text-zinc-800">
                          {k.name}
                        </span>
                        <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[11px] text-zinc-500">
                          {k.keyPrefix}…
                        </code>
                      </div>
                      <p className="mt-0.5 text-[11px] text-zinc-400">
                        Creada{' '}
                        {new Date(k.createdAt).toLocaleDateString('es-ES', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                        {k.lastUsedAt && (
                          <>
                            {' · '}Último uso{' '}
                            {new Date(k.lastUsedAt).toLocaleDateString('es-ES', {
                              day: 'numeric',
                              month: 'short',
                            })}
                          </>
                        )}
                      </p>
                    </div>
                    <button
                      onClick={() => void revokeKey(k.id)}
                      disabled={revoking === k.id}
                      className="ml-3 flex items-center gap-1 rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50 disabled:opacity-40"
                    >
                      {revoking === k.id ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Trash2 size={12} />
                      )}
                      Revocar
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {createdKey && (
        <NewKeyModal
          apiKey={createdKey}
          onClose={() => setCreatedKey(null)}
        />
      )}
    </div>
  );
}
