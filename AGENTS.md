# Egil's Map – Agent Instructions

This document helps AI coding assistants understand and work effectively with the Egil's Map codebase.

## Project Overview

Egil's Map is an open-source digital legacy platform where life journeys are visualized as a map of light. Users create pins, chapters, and beacons; inspiration is visualized as a heatmap; and Strongholds provide community features.

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Backend** | Python 3.10+, FastAPI, SQLAlchemy (async), Alembic, PostgreSQL + PostGIS |
| **Frontend** | Next.js 14, React, TypeScript, Tailwind CSS |
| **3D** | Three.js (React Three Fiber) for Beacon profiles |
| **Map** | Leaflet, Leaflet.heat, MapTiler |
| **Auth** | Auth.js (NextAuth) – Google, GitHub, Email/Password, Telegram |
| **Storage** | S3-compatible (MinIO dev, AWS S3 prod) |
| **Cache** | Redis (optional, DB fallback when unavailable) |

## Directory Structure

```
/
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── api/             # Route handlers (auth, map_router, pins, profile, strongholds, beacon, admin)
│   │   ├── core/            # Config, database, security, logging, rate_limit, redis
│   │   ├── models/          # SQLAlchemy models
│   │   ├── schemas/         # Pydantic schemas
│   │   └── services/        # S3, etc.
│   ├── alembic/             # Database migrations
│   └── requirements.txt
├── frontend/                # Next.js app
│   ├── src/
│   │   ├── app/             # App Router pages (map, profile, pins, strongholds, create-pin, admin, etc.)
│   │   ├── components/     # React components (MapView, BeaconScene, etc.)
│   │   ├── lib/             # API client, i18n
│   │   └── locales/         # i18n translations (en, ru)
│   └── package.json
├── scripts/                 # Admin scripts (make_admin)
├── docker-compose.yml       # Postgres, MinIO, Redis, backend
├── .env.example             # Backend env template
└── frontend/.env.example    # Frontend env template
```

## Development Setup

### Prerequisites
- Python 3.10+
- Node.js 18+
- Docker (for PostgreSQL + PostGIS, MinIO, Redis)

### Quick Start

1. **Infrastructure**
   ```bash
   docker-compose up -d postgres minio redis
   ```

2. **Backend**
   ```bash
   cd backend
   python -m venv venv && source venv/bin/activate
   pip install -r requirements.txt
   cp ../.env.example .env   # Edit as needed
   alembic upgrade head
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

3. **Frontend**
   ```bash
   cd frontend
   npm install
   cp .env.example .env.local   # Set NEXT_PUBLIC_API_URL, NEXTAUTH_SECRET, etc.
   npm run dev
   ```

### Environment Variables

- **Backend** (`backend/.env`): `DATABASE_URL`, `REDIS_URL`, `S3_*`, `AUTH_SECRET`, `JWT_SECRET`, `BACKEND_URL`, `ENVIRONMENT`
- **Frontend** (`frontend/.env.local`): `NEXT_PUBLIC_API_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, OAuth keys

See `.env.example` and `frontend/.env.example` for full lists.

## Key Conventions

- **Backend**: Async SQLAlchemy with `AsyncSessionLocal`; use `Depends(get_db)` for DB sessions; JWT auth via `app.core.security`; rate limiting via SlowAPI.
- **Frontend**: App Router; `src/lib/api.ts` for API calls; `src/lib/i18n.ts` for i18n; Tailwind for styling.
- **Database**: Alembic migrations in `backend/alembic/versions/`; always create a migration for schema changes.
- **i18n**: JSON files in `frontend/src/locales/{en,ru}/common.json`; use `useTranslation('common')` in components.

## Common Tasks

| Task | Command / Location |
|------|-------------------|
| Run migrations | `cd backend && alembic upgrade head` |
| Create migration | `cd backend && alembic revision -m "description"` |
| Backend lint | (no pytest; no dedicated lint script) |
| Frontend lint | `cd frontend && npm run lint` |
| Health check | `GET http://localhost:8000/health` |
| Make user admin | `python scripts/make_admin.py <username>` |

## API Overview

| Prefix | Purpose |
|--------|---------|
| `/auth` | Register, login |
| `/map` | Heatmap, pins in bbox |
| `/pins` | CRUD pins, inspire |
| `/profile` | User profiles |
| `/strongholds` | Communities |
| `/beacon` | Beacon data |
| `/admin` | Admin endpoints |

## Important Files

- `backend/app/main.py` – FastAPI app, routers, health check
- `backend/app/core/config.py` – Settings via Pydantic
- `backend/app/core/database.py` – AsyncSessionLocal
- `backend/app/core/security.py` – JWT decode, password hashing
- `frontend/src/lib/api.ts` – API client
- `frontend/src/auth.ts` – NextAuth config
- `frontend/src/app/map/page.tsx` – Main map view
- `frontend/src/components/MapView.tsx` – Map component
- `frontend/src/components/BeaconScene.tsx` – 3D beacon

## When Editing

1. **Backend models**: Add a new Alembic migration; update schemas if needed.
2. **New API routes**: Add router in `backend/app/api/`, include in `main.py`.
3. **Frontend pages**: Use App Router under `src/app/`; call API via `src/lib/api.ts`.
4. **i18n**: Add keys to `frontend/src/locales/en/common.json` and `ru/common.json`.
5. **CORS**: Add new origins to `_cors_origins` in `main.py` if needed.

## Documentation

- `README.md` – Overview, quick start, API summary
- `LOCAL_SETUP.md` – Local dev without full Docker backend
- `DEPLOYMENT.md` – Production deployment
- `USAGE.md` – User-facing usage
