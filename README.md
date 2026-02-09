# Egil's Map

An open-source digital legacy platform where life journeys are visualized as a map of light.

## Tech Stack

- **Backend**: Python (FastAPI) + PostgreSQL (PostGIS) + SQLAlchemy + Alembic
- **Frontend**: Next.js 14 (React) + TypeScript + Tailwind CSS
- **3D**: Three.js (React Three Fiber) for Beacon profiles
- **Map**: Leaflet + Leaflet.heat
- **Auth**: Auth.js (NextAuth) - Google, GitHub, Email/Password, Telegram
- **Storage**: S3-compatible (MinIO for dev, AWS S3 for prod)

## Prerequisites

- Python 3.10+
- Node.js 18+
- Docker (for PostgreSQL + PostGIS, MinIO)

## Quick Start

### 1. Start infrastructure

```bash
docker-compose up -d
```

### 2. Backend setup

```bash
cd backend
python -m venv venv
# Windows: venv\Scripts\activate
# Unix: source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 3. Frontend setup

```bash
cd frontend
npm install
# Copy .env.example to .env.local and set NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
```

### 4. Environment

Copy `frontend/.env.example` to `frontend/.env.local` and set `NEXTAUTH_SECRET` (any 32+ char string). For OAuth, add Google/GitHub keys.

### 5. MinIO bucket (first run)

Create bucket `egilsmap-uploads` in MinIO at http://localhost:9001 or let the app create it on first upload.

## Environment Variables

See `.env.example` for backend variables. Frontend needs:

- `NEXT_PUBLIC_API_URL` - Backend API URL (default: http://localhost:8000)
- `NEXTAUTH_SECRET` - Auth.js secret
- `NEXTAUTH_URL` - Frontend URL (e.g. http://localhost:3000)
- OAuth: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`
- Optional: `TELEGRAM_BOT_TOKEN` for Telegram Login Widget validation

## Features

- **Global Map & Heatmap**: Inspiration density visualization
- **3D Beacon Profile**: Life chapters as tiers, rotating 3D structure
- **Inspiration**: Max 5 per day; "Go and build something worthy of your own journey" when limit reached
- **Legacy Pins**: Photo, video, text with optional Echo (time/geo locks) and Fog of War (privacy)
- **Strongholds**: Communities with brightness = sum of members' inspiration scores

## API

- `POST /auth/register` - Create account
- `POST /auth/login` - Login (OAuth2 form)
- `GET /map/heatmap` - Heatmap data (bbox params)
- `GET /map/pins` - Pins in bbox
- `POST /pins` - Create pin (multipart)
- `GET /pins/{id}` - Pin detail
- `POST /pins/{id}/inspire` - Inspire (daily limit)
- `GET /profile/{username}/beacon` - Beacon tiers + pins
- `GET/POST /strongholds` - List/create Strongholds
- `POST /strongholds/{id}/join` - Join Stronghold

## License

MIT
