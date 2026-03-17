import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { AlertTriangle, FileSearch, FileUp, Languages, Star } from 'lucide-react'
import { apiRequest } from '../lib/api'
import type { ChangeEvent, FormEvent } from 'react'
import type {
  AnalysisReport,
  IngestResponse,
  IssueType,
  Language,
  Project,
  RunAnalysisResponse,
} from '../lib/types'
import { PageHeader } from '../components/PageHeader'

type IngestFileItem = {
  path: string
  content: unknown
}

const PATTERN_LABELS: Record<Project['i18nPattern'], string> = {
  SINGLE_FILE: 'Archivo unico por idioma',
  FOLDER_PER_LOCALE: 'Carpeta por idioma',
  SUFFIX: 'Sufijo (home_es.json)',
  PREFIX: 'Prefijo (es_home.json)',
}

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const [project, setProject] = useState<Project | null>(null)
  const [languages, setLanguages] = useState<Language[]>([])
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [ingestFiles, setIngestFiles] = useState<IngestFileItem[]>([])
  const [ingestMessage, setIngestMessage] = useState('')
  const [analysisMessage, setAnalysisMessage] = useState('')
  const [analysisReport, setAnalysisReport] = useState<AnalysisReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    if (!projectId) return

    try {
      const [projectData, languagesData] = await Promise.all([
        apiRequest<Project>(`/projects/${projectId}`, { auth: true }),
        apiRequest<Language[]>(`/projects/${projectId}/languages`, { auth: true }),
      ])
      setProject(projectData)
      setLanguages(languagesData)
    } catch {
      setError('No se pudo cargar el proyecto')
    }
  }

  useEffect(() => {
    load()
  }, [projectId])

  const onAddLanguage = async (event: FormEvent) => {
    event.preventDefault()
    if (!projectId) return

    setLoading(true)
    setError('')

    try {
      await apiRequest(`/projects/${projectId}/languages`, {
        method: 'POST',
        auth: true,
        body: { code, name },
      })
      setCode('')
      setName('')
      await load()
    } catch {
      setError('No se pudo anadir el idioma')
    } finally {
      setLoading(false)
    }
  }

  const setReference = async (languageId: string) => {
    if (!projectId) return

    try {
      await apiRequest(`/projects/${projectId}/languages/reference`, {
        method: 'PATCH',
        auth: true,
        body: { languageId },
      })
      await load()
    } catch {
      setError('No se pudo establecer el idioma de referencia')
    }
  }

  const onPickFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) {
      setIngestFiles([])
      return
    }

    setError('')
    setIngestMessage('')

    try {
      const parsed = await Promise.all(
        Array.from(files).map(async (file) => {
          const text = await file.text()
          const content = JSON.parse(text) as unknown
          const relativePath =
            (file as File & { webkitRelativePath?: string }).webkitRelativePath ||
            file.name

          return {
            path: relativePath,
            content,
          }
        }),
      )

      setIngestFiles(parsed)
    } catch {
      setIngestFiles([])
      setError('Uno o varios archivos seleccionados no son JSON valido')
    }
  }

  const onIngest = async () => {
    if (!projectId || ingestFiles.length === 0) {
      return
    }

    setLoading(true)
    setError('')
    setIngestMessage('')

    try {
      const response = await apiRequest<IngestResponse>(
        `/projects/${projectId}/translation-files/ingest`,
        {
          method: 'POST',
          auth: true,
          body: { files: ingestFiles },
        },
      )

      setIngestMessage(
        `Se cargaron ${response.filesIngested} archivo(s) en ${response.fileGroupsAffected} grupo(s)`,
      )
    } catch {
      setError('No se pudieron cargar los archivos')
    } finally {
      setLoading(false)
    }
  }

  const runAnalysis = async () => {
    if (!projectId) {
      return
    }

    setLoading(true)
    setError('')
    setAnalysisMessage('')

    try {
      const result = await apiRequest<RunAnalysisResponse>(
        `/projects/${projectId}/analysis/run`,
        {
          method: 'POST',
          auth: true,
          body: {},
        },
      )

      if (result.reports.length === 0) {
        setAnalysisReport(null)
        setAnalysisMessage('El analisis no genero reportes')
        return
      }

      const latestReportId = result.reports[0].id
      const report = await apiRequest<AnalysisReport>(
        `/projects/${projectId}/analysis/reports/${latestReportId}`,
        { auth: true },
      )

      setAnalysisReport(report)
      setAnalysisMessage(
        `Analisis completado: ${result.issuesCreated} issue(s) en ${result.reportsCreated} reporte(s)`,
      )
    } catch {
      setError('No se pudo ejecutar el analisis')
    } finally {
      setLoading(false)
    }
  }

  const issueTypeLabel = (type: IssueType) => {
    if (type === 'MISSING_KEY') return 'Falta clave'
    if (type === 'UNUSED_KEY') return 'Clave no usada'
    return 'Interpolacion distinta'
  }

  const languageNameById = new Map(languages.map((language) => [language.id, language]))

  return (
    <main className='app-shell'>
      <PageHeader
        title={project ? project.name : 'Proyecto'}
        subtitle='Gestion de idiomas y carga inicial de traducciones'
      />

      <section className='panel'>
        <h2>
          <Languages size={16} />
          Idiomas
        </h2>

        <form className='grid-form' onSubmit={onAddLanguage}>
          <label>
            Codigo
            <input
              placeholder='en'
              value={code}
              onChange={(event) => setCode(event.target.value)}
              required
            />
          </label>

          <label>
            Nombre
            <input
              placeholder='Espanol'
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </label>

          <button type='submit' disabled={loading}>
            {loading ? 'Anadiendo...' : 'Anadir idioma'}
          </button>
        </form>

        {error ? <p className='error'>{error}</p> : null}

        {languages.length === 0 ? (
          <p className='muted'>No hay idiomas configurados.</p>
        ) : (
          <ul className='project-list'>
            {languages.map((language) => {
              const isReference = language.id === project?.referenceLanguageId

              return (
                <li key={language.id}>
                  <div>
                    <strong>{language.name}</strong>
                    <p>{language.code}</p>
                  </div>

                  {isReference ? (
                    <span className='chip'>Referencia</span>
                  ) : (
                    <button
                      type='button'
                      className='ghost'
                      onClick={() => setReference(language.id)}
                    >
                      <Star size={14} />
                      Marcar referencia
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className='panel'>
        <h2>
          <FileUp size={16} />
          Carga de traducciones
        </h2>

        <p className='muted'>
          Patron actual:{' '}
          <strong>{project ? PATTERN_LABELS[project.i18nPattern] : '-'}</strong>
        </p>

        <label>
          Selecciona archivos JSON (tambien puedes elegir una carpeta)
          <input
            type='file'
            accept='.json,application/json'
            multiple
            onChange={onPickFiles}
            // @ts-expect-error - this attribute is supported by Chromium browsers.
            webkitdirectory=''
          />
        </label>

        {ingestFiles.length > 0 ? (
          <ul className='project-list'>
            {ingestFiles.map((file) => (
              <li key={file.path}>
                <div>
                  <strong>{file.path}</strong>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className='muted'>Todavia no has seleccionado archivos.</p>
        )}

        <div style={{ marginTop: '12px' }}>
          <button
            type='button'
            onClick={onIngest}
            disabled={loading || ingestFiles.length === 0}
          >
            {loading ? 'Cargando...' : 'Cargar archivos'}
          </button>
        </div>

        {ingestMessage ? <p className='chip' style={{ marginTop: '10px' }}>{ingestMessage}</p> : null}
      </section>

      <section className='panel'>
        <h2>
          <FileSearch size={16} />
          Analisis de archivos
        </h2>

        <p className='muted'>
          Ejecuta una comparacion contra el idioma de referencia para detectar
          claves faltantes, no usadas e interpolaciones inconsistentes.
        </p>

        <div style={{ marginTop: '12px' }}>
          <button type='button' onClick={runAnalysis} disabled={loading}>
            {loading ? 'Analizando...' : 'Ejecutar analisis'}
          </button>
        </div>

        {analysisMessage ? (
          <p className='chip' style={{ marginTop: '10px' }}>
            {analysisMessage}
          </p>
        ) : null}

        {analysisReport ? (
          <div style={{ marginTop: '12px' }}>
            <h3 className='panel-subtitle'>Resultado del ultimo reporte</h3>
            {analysisReport.issues.length === 0 ? (
              <p className='muted'>No se encontraron issues.</p>
            ) : (
              <ul className='project-list'>
                {analysisReport.issues.map((issue) => {
                  const language = languageNameById.get(issue.languageId)
                  return (
                    <li key={issue.id}>
                      <div>
                        <strong>{issue.key}</strong>
                        <p>
                          {issueTypeLabel(issue.type)} ·{' '}
                          {language ? `${language.name} (${language.code})` : issue.languageId}
                        </p>
                      </div>
                      <span className='chip'>{issue.type}</span>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        ) : (
          <p className='muted' style={{ marginTop: '10px' }}>
            Aun no hay un reporte cargado.
          </p>
        )}

        {!project?.referenceLanguageId ? (
          <p className='error' style={{ marginTop: '10px' }}>
            <AlertTriangle size={14} style={{ verticalAlign: 'text-bottom' }} />{' '}
            Debes marcar un idioma de referencia antes de ejecutar el analisis.
          </p>
        ) : null}
      </section>
    </main>
  )
}
