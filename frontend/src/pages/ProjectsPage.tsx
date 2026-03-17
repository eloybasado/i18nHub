import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FolderPlus, FolderTree } from 'lucide-react'
import { apiRequest } from '../lib/api'
import type { FormEvent } from 'react'
import type { I18nPattern, Project } from '../lib/types'
import { PageHeader } from '../components/PageHeader'

const PATTERNS: I18nPattern[] = [
  'SINGLE_FILE',
  'FOLDER_PER_LOCALE',
  'SUFFIX',
  'PREFIX',
]

const PATTERN_LABELS: Record<I18nPattern, string> = {
  SINGLE_FILE: 'Archivo unico por idioma',
  FOLDER_PER_LOCALE: 'Carpeta por idioma',
  SUFFIX: 'Sufijo (home_es.json)',
  PREFIX: 'Prefijo (es_home.json)',
}

export function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [i18nPattern, setI18nPattern] = useState<I18nPattern>('SINGLE_FILE')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadProjects = async () => {
    try {
      const data = await apiRequest<Project[]>('/projects', { auth: true })
      setProjects(data)
    } catch {
      setError('No se pudieron cargar los proyectos')
    }
  }

  useEffect(() => {
    loadProjects()
  }, [])

  const onCreate = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      await apiRequest<Project>('/projects', {
        method: 'POST',
        auth: true,
        body: {
          name,
          description: description || undefined,
          i18nPattern,
        },
      })

      setName('')
      setDescription('')
      setI18nPattern('SINGLE_FILE')
      await loadProjects()
    } catch {
      setError('No se pudo crear el proyecto')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className='app-shell'>
      <PageHeader
        title='Proyectos'
        subtitle='Crea un proyecto y organiza tus archivos de traduccion.'
      />

      <section className='panel'>
        <h2>
          <FolderPlus size={16} />
          Nuevo proyecto
        </h2>
        <form className='grid-form' onSubmit={onCreate}>
          <label>
            Nombre
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              minLength={2}
              required
            />
          </label>

          <label>
            Patron
            <select
              value={i18nPattern}
              onChange={(event) => setI18nPattern(event.target.value as I18nPattern)}
            >
              {PATTERNS.map((pattern) => (
                <option key={pattern} value={pattern}>
                  {PATTERN_LABELS[pattern]}
                </option>
              ))}
            </select>
          </label>

          <label className='full'>
            Descripcion
            <input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder='Opcional'
            />
          </label>

          <button type='submit' disabled={loading}>
            {loading ? 'Creando...' : 'Crear proyecto'}
          </button>
        </form>
      </section>

      <section className='panel'>
        <h2>
          <FolderTree size={16} />
          Tus proyectos
        </h2>

        {error ? <p className='error'>{error}</p> : null}

        {projects.length === 0 ? (
          <p className='muted'>Todavia no hay proyectos.</p>
        ) : (
          <ul className='project-list'>
            {projects.map((project) => (
              <li key={project.id}>
                <div>
                  <strong>{project.name}</strong>
                  <p>{PATTERN_LABELS[project.i18nPattern]}</p>
                </div>
                <Link to={`/projects/${project.id}`}>Abrir</Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
