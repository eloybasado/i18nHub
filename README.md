# i18nHub

Plataforma web open source para gestionar, analizar y mejorar traducciones JSON en proyectos frontend.

🌐 **Demo pública:** [https://i18nhub.vercel.app](https://i18nhub.vercel.app) · **Licencia:** GPL-3.0 / Comercial

---

## Stack

| Capa     | Tecnologías                               |
| -------- | ----------------------------------------- |
| Frontend | React 19 · Vite · TailwindCSS · shadcn/ui |
| Backend  | NestJS · Prisma · PostgreSQL              |
| IA       | Groq API                                  |

## Estructura del monorepo

```
i18nHub/
├── frontend/          # App React
├── backend/           # API NestJS
└── docker-compose.yml # PostgreSQL en local
```

## Arranque rápido

**Requisitos:** Node.js 20+, npm 10+, pnpm 9+, Docker y Docker Compose.

```bash
# 1. Clonar
git clone <URL_DEL_REPO>
cd i18nHub

# 2. Levantar PostgreSQL
docker compose up -d postgres

# 3. Instalar dependencias
cd backend && npm install
cd ../frontend && pnpm install
cd ..

# 4. Variables de entorno (ver sección siguiente)

# 5. Migraciones
cd backend && npx prisma migrate dev && cd ..

# 6. Arrancar backend (terminal 1)
cd backend && npm run start:dev

# 7. Arrancar frontend (terminal 2)
cd frontend && pnpm dev
```

Frontend en `http://localhost:5173` · Backend en `http://localhost:3000`

## Variables de entorno

### Backend — `backend/.env` (copia desde `backend/.env.example`)

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/i18nhub?schema=public"
JWT_ACCESS_SECRET="dev_access_secret_change_me"
JWT_REFRESH_SECRET="dev_refresh_secret_change_me"
CORS_ORIGIN="http://localhost:5173"
THROTTLE_TTL="60"
THROTTLE_LIMIT="120"
GROQ_API_KEY=""
GROQ_API_URL="https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL="llama-3.1-8b-instant"
```

### Frontend — `frontend/.env`

```env
VITE_API_URL="http://localhost:3000"
```

## Licencia

i18nHub se distribuye bajo licencia [GPL-3.0](LICENSE) para uso open source.

Para uso comercial o integración en productos propietarios, contacta con el autor para obtener una licencia comercial.
