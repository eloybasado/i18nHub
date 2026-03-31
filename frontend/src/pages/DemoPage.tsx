import { Download, Languages, Upload } from 'lucide-react'
import type { ChangeEvent } from 'react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { notify } from '../lib/toast'

type VisualEntry = {
  path: string
  value: string
}

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

const extractStringEntries = (
  value: unknown,
  prefix = '',
  acc: VisualEntry[] = [],
): VisualEntry[] => {
  if (typeof value === 'string') {
    acc.push({ path: prefix, value })
    return acc
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      const nextPrefix = prefix ? `${prefix}.${index}` : String(index)
      extractStringEntries(item, nextPrefix, acc)
    })
    return acc
  }

  if (isPlainObject(value)) {
    Object.entries(value).forEach(([key, nestedValue]) => {
      const nextPrefix = prefix ? `${prefix}.${key}` : key
      extractStringEntries(nestedValue, nextPrefix, acc)
    })
  }

  return acc
}

const setStringByPath = (target: unknown, path: string, value: string): void => {
  type JsonContainer = Record<string, unknown> | unknown[]

  const segments = path.split('.')
  let cursor = target as JsonContainer

  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index]
    const isLast = index === segments.length - 1
    const nextSegment = segments[index + 1]
    const nextIsArrayIndex = nextSegment !== undefined && /^\d+$/.test(nextSegment)
    const cursorIsArray = Array.isArray(cursor)
    const arrayKey = Number(segment)
    const objectKey = segment

    if (isLast && cursorIsArray) {
      ;(cursor as unknown[])[arrayKey] = value
      return
    }

    if (isLast && !cursorIsArray) {
      ;(cursor as Record<string, unknown>)[objectKey] = value
      return
    }

    const nextValue = cursorIsArray
      ? (cursor as unknown[])[arrayKey]
      : (cursor as Record<string, unknown>)[objectKey]

    if (nextValue === undefined || nextValue === null || typeof nextValue !== 'object') {
      const initialized = nextIsArrayIndex ? [] : {}

      if (cursorIsArray) {
        ;(cursor as unknown[])[arrayKey] = initialized
      } else {
        ;(cursor as Record<string, unknown>)[objectKey] = initialized
      }

      cursor = initialized as JsonContainer
      continue
    }

    cursor = nextValue as JsonContainer
  }
}

const buildVisualContent = (
  baseContent: Record<string, unknown>,
  entries: VisualEntry[],
) => {
  const cloned = JSON.parse(JSON.stringify(baseContent)) as Record<string, unknown>
  entries.forEach((entry) => {
    setStringByPath(cloned, entry.path, entry.value)
  })
  return cloned
}

const DEMO_SAMPLE: Record<string, unknown> = {
  home: {
    title: 'Welcome to i18nHub',
    subtitle: 'Manage your translations easily',
  },
  dashboard: {
    greeting: 'Hello {name}',
    tasks: ['Review keys', 'Translate missing strings'],
  },
}

export function DemoPage() {
  const [fileName, setFileName] = useState('demo.json')
  const [editorMode, setEditorMode] = useState<'RAW' | 'VISUAL'>('VISUAL')
  const [baseContent, setBaseContent] = useState<Record<string, unknown> | null>(DEMO_SAMPLE)
  const [editorJson, setEditorJson] = useState(JSON.stringify(DEMO_SAMPLE, null, 2))
  const [visualEntries, setVisualEntries] = useState<VisualEntry[]>(extractStringEntries(DEMO_SAMPLE))
  const [visualQuery, setVisualQuery] = useState('')

  const filteredEntries = useMemo(() => {
    const q = visualQuery.trim().toLowerCase()
    if (!q) return visualEntries
    return visualEntries.filter(
      (entry) =>
        entry.path.toLowerCase().includes(q) || entry.value.toLowerCase().includes(q),
    )
  }, [visualEntries, visualQuery])

  const loadFromFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const raw = await file.text()
      const parsed = JSON.parse(raw) as Record<string, unknown>
      setFileName(file.name)
      setBaseContent(parsed)
      setEditorJson(JSON.stringify(parsed, null, 2))
      setVisualEntries(extractStringEntries(parsed))
      setEditorMode('VISUAL')
      setVisualQuery('')
      notify.success('Archivo de demo cargado')
    } catch {
      notify.error('El archivo no es un JSON valido')
    }
  }

  const onModeChange = (mode: 'RAW' | 'VISUAL') => {
    if (mode === 'VISUAL') {
      try {
        const parsed = JSON.parse(editorJson) as Record<string, unknown>
        setBaseContent(parsed)
        setVisualEntries(extractStringEntries(parsed))
      } catch {
        notify.error('No puedes cambiar a visual con JSON invalido')
        return
      }
    }

    setEditorMode(mode)
  }

  const getCurrentContent = (): Record<string, unknown> | null => {
    if (editorMode === 'RAW') {
      try {
        return JSON.parse(editorJson) as Record<string, unknown>
      } catch {
        notify.error('El JSON actual no es valido')
        return null
      }
    }

    if (!baseContent) {
      notify.error('No hay contenido en demo')
      return null
    }

    return buildVisualContent(baseContent, visualEntries)
  }

  const downloadCurrentJson = () => {
    const content = getCurrentContent()
    if (!content) return

    const blob = new Blob([JSON.stringify(content, null, 2)], {
      type: 'application/json;charset=utf-8',
    })

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName.endsWith('.json') ? fileName : `${fileName}.json`
    link.click()
    URL.revokeObjectURL(url)
    notify.success('Archivo descargado')
  }

  const loadSample = () => {
    setFileName('demo.json')
    setBaseContent(DEMO_SAMPLE)
    setEditorJson(JSON.stringify(DEMO_SAMPLE, null, 2))
    setVisualEntries(extractStringEntries(DEMO_SAMPLE))
    setEditorMode('VISUAL')
    setVisualQuery('')
    notify.info('Ejemplo cargado')
  }

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
            <Button type="button" variant="outline" onClick={loadSample} className="border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100">
              Cargar ejemplo
            </Button>
            <Link to="/login">
              <Button type="button" variant="outline" className="border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100">
                Iniciar sesión
              </Button>
            </Link>
            <Link to="/register">
              <Button type="button">Crear cuenta</Button>
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-6 md:px-6">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-zinc-950 md:text-3xl">Modo Demo</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Prueba el editor sin cuenta: sube JSON, edita y descarga.
          </p>
        </div>

        <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-2 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 hover:bg-zinc-100">
            <Upload size={14} />
            Subir JSON
            <input
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={loadFromFile}
            />
          </label>

          <Button type="button" variant="outline" onClick={() => onModeChange('RAW')}>
            RAW
          </Button>
          <Button type="button" variant="outline" onClick={() => onModeChange('VISUAL')}>
            Visual
          </Button>

          <Button
            type="button"
            className="ml-auto border-emerald-700 bg-emerald-600 text-white hover:bg-emerald-700"
            onClick={downloadCurrentJson}
          >
            <Download size={15} className="mr-1.5" />
            Descargar JSON
          </Button>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700">
          <span className="font-medium text-zinc-900">Archivo activo:</span> {fileName}
        </div>

        {editorMode === 'RAW' ? (
          <textarea
            className="min-h-[380px] w-full rounded-lg border border-zinc-300 bg-white p-3 font-mono text-sm text-zinc-900 outline-none focus:border-zinc-500"
            value={editorJson}
            onChange={(event) => setEditorJson(event.target.value)}
          />
        ) : (
          <div className="space-y-3">
            <Input
              value={visualQuery}
              onChange={(event) => setVisualQuery(event.target.value)}
              placeholder="Buscar por clave o texto..."
            />

            <div className="max-h-[560px] space-y-4 overflow-auto pr-1">
              {filteredEntries.length === 0 ? (
                <p className="text-base text-zinc-500">No hay campos para mostrar.</p>
              ) : (
                filteredEntries.map((entry) => (
                  <label key={entry.path} className="block border-b border-zinc-200 pb-4">
                    <span className="inline-flex rounded bg-zinc-100 px-2 py-1 font-mono text-sm font-semibold text-zinc-800">
                      {entry.path}
                    </span>
                    <textarea
                      className="mt-2 min-h-[96px] w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base leading-relaxed text-zinc-900 outline-none focus:border-zinc-500"
                      value={entry.value}
                      onChange={(event) => {
                        setVisualEntries((prev) =>
                          prev.map((item) =>
                            item.path === entry.path
                              ? { ...item, value: event.target.value }
                              : item,
                          ),
                        )
                      }}
                    />
                  </label>
                ))
              )}
            </div>
          </div>
        )}
        </div>
      </section>
    </main>
  )
}
