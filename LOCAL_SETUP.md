# Local Development Setup (Without Docker Backend)

Due to Docker network connectivity issues, you can run the backend locally while using Docker for database and storage services.

## Current Setup

- ✅ **PostgreSQL + PostGIS**: Running in Docker (port 5433)
- ✅ **MinIO**: Running in Docker (ports 9000, 9001)
- ⚠️ **Redis**: Temporarily disabled (app will use DB fallback)
- 🔧 **Backend**: Run locally (see below)
- 🔧 **Frontend**: Run locally (see below)

## Step 1: Start Docker Services

```bash
docker-compose up -d postgres minio
```

Verify they're running:
```bash
docker-compose ps
```

## Step 2: Run Database Migrations

```bash
cd backend
source venv/bin/activate  # or: .venv\Scripts\activate on Windows
pip install -r requirements.txt  # if not already installed
alembic upgrade head
```

## Step 3: Configure Environment

Make sure your `.env` file has:

```bash
DATABASE_URL=postgresql+asyncpg://egilsmap:egilsmap_secret@localhost:5433/egilsmap
REDIS_URL=redis://localhost:6379/0  # Will fail gracefully if Redis not running
S3_ENDPOINT_URL=http://localhost:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=egilsmap-uploads
S3_REGION=us-east-1
AUTH_SECRET=your-auth-secret-min-32-chars
BACKEND_URL=http://localhost:8000
ENVIRONMENT=development
```

## Step 4: Start Backend Locally

```bash
cd backend
source venv/bin/activate  # Windows: .venv\Scripts\activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend will be available at: `http://localhost:8000`

## Step 5: Start Frontend

In a new terminal:

```bash
cd frontend
npm install  # if not already done
npm run dev
```

Frontend will be available at: `http://localhost:3000`

## Health Check

Visit: `http://localhost:8000/health`

Expected response (Redis will show error but app works):
```json
{
  "status": "healthy",
  "db": "ok",
  "redis": "error: ...",
  "s3": "ok"
}
```

## Optional: Install Redis Locally

If you want Redis caching:

```bash
# Ubuntu/Debian
sudo apt-get install redis-server
sudo systemctl start redis-server

# macOS
brew install redis
brew services start redis

# Then Redis will work at redis://localhost:6379/0
```

## Troubleshooting

### Database Connection Issues
- Verify PostgreSQL is running: `docker-compose ps postgres`
- Check connection: `docker-compose exec postgres psql -U egilsmap -d egilsmap -c "SELECT 1;"`

### MinIO Access
- Web UI: http://localhost:9001
- Login: minioadmin / minioadmin
- Create bucket: `egilsmap-uploads` (or let app create it)

### Port Conflicts
- Backend port 8000: Change in `uvicorn` command or `.env`
- Frontend port 3000: Change in `package.json` scripts

## When Docker Network is Fixed

1. Uncomment backend and nginx in `docker-compose.yml`
2. Uncomment redis section
3. Run: `docker-compose up -d`
