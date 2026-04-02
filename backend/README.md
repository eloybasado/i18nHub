# i18nHub Backend

Backend API for i18nHub using NestJS + Prisma + PostgreSQL.

## Requirements

- Node.js 20+
- npm 10+
- Docker + Docker Compose

## Quick Start

1. Install dependencies

```bash
npm install
```

2. Start PostgreSQL (from workspace root)

```bash
cd ..
docker compose up -d postgres
cd backend
```

3. Create `.env` (if it does not exist)

```bash
cp .env.example .env
```

If `.env.example` is not present yet, use this:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/i18nhub?schema=public"
JWT_ACCESS_SECRET="dev_access_secret_change_me"
JWT_REFRESH_SECRET="dev_refresh_secret_change_me"
CORS_ORIGIN="http://localhost:5173"
THROTTLE_TTL="60"
THROTTLE_LIMIT="120"
GROQ_API_KEY="your_groq_api_key"
GROQ_API_URL="https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL="llama-3.1-8b-instant"
```

4. Run migrations and generate Prisma client

```bash
npx prisma migrate dev --name init
```

5. Run API

```bash
npm run start:dev
```

Default API URL: `http://localhost:3000`

## Scripts

```bash
# compile
npm run build

# unit tests
npm run test

# e2e tests
npm run test:e2e

# coverage
npm run test:cov

# format
npm run format
```

## Auth Endpoints (current)

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `GET /auth/me` (JWT required)
- `GET /auth/admin-check` (ADMIN only)

## Project Domain Endpoints (current)

- `POST /projects`
- `GET /projects`
- `GET /projects/:id`
- `PATCH /projects/:id`
- `POST /projects/:id/members`
- `POST /projects/:projectId/languages`
- `GET /projects/:projectId/languages`
- `PATCH /projects/:projectId/languages/reference`
- `POST /projects/:projectId/translation-files/ingest`

## Notes

- Prisma baseline is `6.19.0` for this sprint to avoid Prisma 7 migration overhead.
- Docker PostgreSQL is exposed on host port `5433` to avoid conflicts with local Postgres on `5432`.
