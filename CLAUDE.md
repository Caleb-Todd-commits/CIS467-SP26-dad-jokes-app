# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the App

```bash
# Start all services (recommended — fully containerized)
docker compose up --build

# Stop and clean up
docker compose down -v
```

The app is available at `http://localhost:8080`. The frontend proxies `/api/*` requests to the Express API via nginx.
pgAdmin is available at `http://localhost:5050`.

Docker Compose Watch is supported:

```bash
docker compose up --build --watch
```

Database credentials are provided through the Compose secret at `secrets/db_password.txt`.

## Local Development (without Docker)

Requires a running PostgreSQL instance. The API reads `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and either `DB_PASSWORD` or `DB_PASSWORD_FILE`.

```bash
# API (port 3000)
cd api && npm install
export DB_HOST=localhost DB_USER=dadjokes DB_PASSWORD=dadjokes DB_NAME=dadjokes
npm run dev

# Frontend (port 5173)
cd frontend && npm install && npm run dev
```

### Build commands

```bash
cd api && npm run build        # Compile TypeScript → dist/
cd frontend && npm run build   # tsc check + Vite production build
```

There are no lint or test scripts defined in either package.json.

## Architecture

Three-tier containerized app: **React SPA → Nginx → Express API → PostgreSQL**.

- **[frontend/src/App.tsx](frontend/src/App.tsx)** — Single monolithic React component with all UI, state, and fetch logic. Three views: Random, Browse (with category filter), Add. Uses only React hooks (no external state library). All styles are inline.
- **[api/src/index.ts](api/src/index.ts)** — Single-file Express server with all 8 REST endpoints and direct `pg` pool queries. No ORM; uses parameterized queries.
- **[db/init.sql](db/init.sql)** — Single `jokes` table schema + 20 seed rows across categories (science, food, work, animals, tech, general, nature, sports).
- **[frontend/nginx.conf](frontend/nginx.conf)** — Serves the SPA and reverse-proxies `/api/*` to `http://api:3000`. Handles SPA client-side routing via `try_files`.

### API Endpoints

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/health` | DB connectivity check |
| GET | `/api/jokes` | Optional `?category=` filter |
| GET | `/api/jokes/random` | Increments `times_told` |
| GET | `/api/jokes/:id` | |
| POST | `/api/jokes` | Body: `{ setup, punchline, category }` |
| PATCH | `/api/jokes/:id/rate` | Body: `{ rating }` (0–5) |
| DELETE | `/api/jokes/:id` | |
| GET | `/api/categories` | Distinct categories from DB |
| GET | `/api/stats` | Collection totals and top joke insights |

### Docker Setup

Both app services use multi-stage builds (builder → slim runtime). The API has a startup retry loop for DB readiness. Docker Compose health checks gate service startup order. Compose Watch rebuilds services when source/config files change, and Compose Secrets provide the shared database password to Postgres, the API, and pgAdmin.
