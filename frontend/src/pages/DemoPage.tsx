import { Download, Upload } from 'lucide-react';
import type { ChangeEvent } from 'react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { PublicHeader } from '../components/common/PublicHeader';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { notify } from '../lib/toast';

type VisualEntry = {
  path: string;
  value: string;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const extractStringEntries = (value: unknown, prefix = '', acc: VisualEntry[] = []): VisualEntry[] => {
  if (typeof value === 'string') {
    acc.push({ path: prefix, value });
    return acc;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      const nextPrefix = prefix ? `${prefix}.${index}` : String(index);
      extractStringEntries(item, nextPrefix, acc);
    });
    return acc;
  }

  if (isPlainObject(value)) {
    Object.entries(value).forEach(([key, nestedValue]) => {
      const nextPrefix = prefix ? `${prefix}.${key}` : key;
      extractStringEntries(nestedValue, nextPrefix, acc);
    });
  }

  return acc;
};

const setStringByPath = (target: unknown, path: string, value: string): void => {
  type JsonContainer = Record<string, unknown> | unknown[];

  const segments = path.split('.');
  let cursor = target as JsonContainer;

  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    const isLast = index === segments.length - 1;
    const nextSegment = segments[index + 1];
    const nextIsArrayIndex = nextSegment !== undefined && /^\d+$/.test(nextSegment);
    const cursorIsArray = Array.isArray(cursor);
    const arrayKey = Number(segment);
    const objectKey = segment;

    if (isLast && cursorIsArray) {
      (cursor as unknown[])[arrayKey] = value;
      return;
    }

    if (isLast && !cursorIsArray) {
      (cursor as Record<string, unknown>)[objectKey] = value;
      return;
    }

    const nextValue = cursorIsArray ? (cursor as unknown[])[arrayKey] : (cursor as Record<string, unknown>)[objectKey];

    if (nextValue === undefined || nextValue === null || typeof nextValue !== 'object') {
      const initialized = nextIsArrayIndex ? [] : {};

      if (cursorIsArray) {
        (cursor as unknown[])[arrayKey] = initialized;
      } else {
        (cursor as Record<string, unknown>)[objectKey] = initialized;
      }

      cursor = initialized as JsonContainer;
      continue;
    }

    cursor = nextValue as JsonContainer;
  }
};

const buildVisualContent = (baseContent: Record<string, unknown>, entries: VisualEntry[]) => {
  const cloned = JSON.parse(JSON.stringify(baseContent)) as Record<string, unknown>;
  entries.forEach((entry) => {
    setStringByPath(cloned, entry.path, entry.value);
  });
  return cloned;
};

const DEMO_SAMPLE: Record<string, unknown> = {
  home: {
    title: 'Welcome to i18nHub',
    subtitle: 'Manage your translations easily',
  },
  dashboard: {
    greeting: 'Hello {name}',
    tasks: ['Review keys', 'Translate missing strings'],
  },
};

export function DemoPage() {
  const [fileName, setFileName] = useState('demo.json');
  const [editorMode, setEditorMode] = useState<'RAW' | 'VISUAL'>('VISUAL');
  const [baseContent, setBaseContent] = useState<Record<string, unknown> | null>(DEMO_SAMPLE);
  const [editorJson, setEditorJson] = useState(JSON.stringify(DEMO_SAMPLE, null, 2));
  const [visualEntries, setVisualEntries] = useState<VisualEntry[]>(extractStringEntries(DEMO_SAMPLE));
  const [visualQuery, setVisualQuery] = useState('');

  const filteredEntries = useMemo(() => {
    const q = visualQuery.trim().toLowerCase();
    if (!q) return visualEntries;
    return visualEntries.filter(
      (entry) => entry.path.toLowerCase().includes(q) || entry.value.toLowerCase().includes(q),
    );
  }, [visualEntries, visualQuery]);

  const loadFromFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const raw = await file.text();
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      setFileName(file.name);
      setBaseContent(parsed);
      setEditorJson(JSON.stringify(parsed, null, 2));
      setVisualEntries(extractStringEntries(parsed));
      setEditorMode('VISUAL');
      setVisualQuery('');
      notify.success('Archivo de demo cargado');
    } catch {
      notify.error('El archivo no es un JSON valido');
    }
  };

  const onModeChange = (mode: 'RAW' | 'VISUAL') => {
    if (mode === 'VISUAL') {
      try {
        const parsed = JSON.parse(editorJson) as Record<string, unknown>;
        setBaseContent(parsed);
        setVisualEntries(extractStringEntries(parsed));
      } catch {
        notify.error('No puedes cambiar a visual con JSON invalido');
        return;
      }
    }

    setEditorMode(mode);
  };

  const getCurrentContent = (): Record<string, unknown> | null => {
    if (editorMode === 'RAW') {
      try {
        return JSON.parse(editorJson) as Record<string, unknown>;
      } catch {
        notify.error('El JSON actual no es valido');
        return null;
      }
    }

    if (!baseContent) {
      notify.error('No hay contenido en demo');
      return null;
    }

    return buildVisualContent(baseContent, visualEntries);
  };

  const downloadCurrentJson = () => {
    const content = getCurrentContent();
    if (!content) return;

    const blob = new Blob([JSON.stringify(content, null, 2)], {
      type: 'application/json;charset=utf-8',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName.endsWith('.json') ? fileName : `${fileName}.json`;
    link.click();
    URL.revokeObjectURL(url);
    notify.success('Archivo descargado');
  };

  const loadSample = () => {
    setFileName('demo.json');
    setBaseContent(DEMO_SAMPLE);
    setEditorJson(JSON.stringify(DEMO_SAMPLE, null, 2));
    setVisualEntries(extractStringEntries(DEMO_SAMPLE));
    setEditorMode('VISUAL');
    setVisualQuery('');
    notify.info('Ejemplo cargado');
  };

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900">
      <PublicHeader
        rightSlot={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={loadSample}
              className="border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100"
            >
              Cargar ejemplo
            </Button>
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

      <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 md:px-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-black tracking-tight text-zinc-950">Modo Demo</h1>
          <p className="text-base text-zinc-600">
            Prueba el editor sin cuenta. Sube un JSON, edita en visual o RAW, y descarga.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
          {/* Sidebar with controls */}
          <div className="space-y-4">
            {/* Active file card */}
            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Archivo activo</p>
              <p className="mt-2 break-words font-mono text-sm font-medium text-zinc-900">{fileName}</p>
            </div>

            {/* Upload button */}
            <label className="block cursor-pointer">
              <div className="flex items-center gap-3 rounded-xl border-2 border-dashed border-zinc-300 bg-white p-4 transition-colors hover:border-zinc-400 hover:bg-zinc-50">
                <Upload size={18} className="text-zinc-600" />
                <div>
                  <p className="text-sm font-semibold text-zinc-900">Subir JSON</p>
                  <p className="text-xs text-zinc-500">o arrastra aquí</p>
                </div>
              </div>
              <input type="file" accept=".json,application/json" className="hidden" onChange={loadFromFile} />
            </label>

            {/* Mode toggle */}
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Modo de edición</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onModeChange('VISUAL')}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                    editorMode === 'VISUAL'
                      ? 'bg-zinc-900 text-white'
                      : 'border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100'
                  }`}
                >
                  Visual
                </button>
                <button
                  type="button"
                  onClick={() => onModeChange('RAW')}
                  className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
                    editorMode === 'RAW'
                      ? 'bg-zinc-900 text-white'
                      : 'border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100'
                  }`}
                >
                  RAW
                </button>
              </div>
            </div>

            {/* Download button */}
            <Button
              type="button"
              onClick={downloadCurrentJson}
              className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <Download size={16} className="mr-2" />
              Descargar JSON
            </Button>
          </div>

          {/* Editor area */}
          <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden flex flex-col">
            {editorMode === 'RAW' ? (
              <>
                <div className="border-b border-zinc-200 px-6 py-4">
                  <p className="text-sm font-semibold text-zinc-900">Edición RAW (JSON)</p>
                </div>
                <textarea
                  className="flex-1 resize-none bg-white p-6 font-mono text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/10"
                  value={editorJson}
                  onChange={(event) => setEditorJson(event.target.value)}
                  spellCheck="false"
                />
              </>
            ) : (
              <>
                <div className="border-b border-zinc-200 px-6 py-4">
                  <p className="text-sm font-semibold text-zinc-900">Edición Visual</p>
                </div>
                <div className="flex-1 overflow-auto">
                  <div className="p-6 space-y-4">
                    <Input
                      value={visualQuery}
                      onChange={(event) => setVisualQuery(event.target.value)}
                      placeholder="Buscar por clave o texto..."
                      className="border-zinc-300"
                    />

                    {filteredEntries.length === 0 ? (
                      <div className="py-12 text-center">
                        <p className="text-base text-zinc-500">No hay campos para mostrar.</p>
                      </div>
                    ) : (
                      <div className="space-y-5">
                        {filteredEntries.map((entry) => (
                          <div key={entry.path} className="space-y-2">
                            <label className="block">
                              <span className="inline-flex rounded-lg bg-zinc-100 px-2.5 py-1 font-mono text-xs font-bold text-zinc-700">
                                {entry.path}
                              </span>
                            </label>
                            <textarea
                              className="min-h-[72px] w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm leading-relaxed text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-900/5"
                              value={entry.value}
                              onChange={(event) => {
                                setVisualEntries((prev) =>
                                  prev.map((item) =>
                                    item.path === entry.path ? { ...item, value: event.target.value } : item,
                                  ),
                                );
                              }}
                              spellCheck="false"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
