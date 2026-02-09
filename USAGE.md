# Usage Guide - Egil's Map Production System

## Quick Start

### 1. Environment Setup

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Edit `.env` and set your production secrets:
- `AUTH_SECRET`: Generate a secure random string (min 32 chars)
- `JWT_SECRET`: Generate another secure random string
- Update database credentials if needed
- Update Redis URL if using external Redis
- Configure S3 credentials (or keep MinIO defaults for dev)

### 2. Database Migrations

Run the Alembic migrations to set up the database schema:

```bash
cd backend
alembic upgrade head
```

This will:
- Create RBAC fields (role, is_shadow_banned, is_muted)
- Create reports table
- Create global_settings table
- Add spatial indexes for PostGIS optimization

### 3. Start Services with Docker Compose

Start all services (PostgreSQL with PostGIS, Redis, MinIO, Backend, Nginx):

```bash
docker-compose up -d
```

Or start services individually:
```bash
# Start database and storage
docker-compose up -d postgres redis minio

# Start backend (after DB is ready)
docker-compose up -d backend

# Start nginx reverse proxy
docker-compose up -d nginx
```

### 4. Check Service Health

Visit the health check endpoint:
```bash
curl http://localhost:8000/health
```

Or in browser: `http://localhost:8000/health`

Expected response:
```json
{
  "status": "healthy",
  "db": "ok",
  "redis": "ok",
  "s3": "ok"
}
```

## Key Features Usage

### Admin Dashboard

**Access:** Navigate to `http://localhost:3000/admin` (or your frontend URL)

**Requirements:**
- Must be logged in
- User must have `ADMIN` role

**To create an admin user:**

1. Register a regular user first through the frontend
2. Connect to the database:
```bash
docker-compose exec postgres psql -U egilsmap -d egilsmap
```

3. Update user role:
```sql
UPDATE users SET role = 'ADMIN' WHERE username = 'your_username';
```

**Admin Dashboard Features:**

1. **Reports Table**
   - View all user reports
   - See reporter, reported user/pin, reason, and status

2. **User Management**
   - View all users with roles and scores
   - **Shadow Ban**: Makes user invisible to others (they appear as not authenticated)
   - **Mute**: User can see content but cannot interact (create pins, inspire, etc.)

3. **Global Settings**
   - **Star Map Visibility**: Toggle global visibility of star map feature

### Role-Based Access Control (RBAC)

**User Roles:**
- `USER`: Default role, can create content and interact
- `MODERATOR`: Can moderate content (future feature)
- `ADMIN`: Full access to admin dashboard and all features

**Shadow Banned Users:**
- Appear as not authenticated to other users
- Their content is hidden from others
- They can still log in but are effectively invisible

**Muted Users:**
- Can view content but cannot:
  - Create pins
  - Inspire pins
  - Create strongholds
  - Join strongholds
  - Create/update/delete beacon tiers

### Hybrid Map

The map now features:
- **Base Layer**: Esri World Imagery (satellite imagery)
- **Overlay Layer**: CartoDB PositronOnlyLabels (light-gray, semi-transparent labels)
- **Heatmap**: Shows inspiration density
- **Markers**: Pin locations

Labels are automatically styled to be light-gray and semi-transparent so they don't dominate the visual.

### Redis Caching

Daily inspiration counts are cached in Redis:
- Key format: `inspiration_count:{user_id}:{date}`
- TTL: Expires at end of day (UTC)
- Falls back to database if cache miss

### Rate Limiting

Rate limits are enforced:
- Map endpoints: 100 requests/minute
- Pin creation: 10 requests/hour
- Inspiration: 5 requests/day (also enforced in endpoint logic)
- Admin endpoints: 50 requests/minute

Rate limit errors return HTTP 429 with details.

### Structured Logging

Logs are output in JSON format:
- Console output (development)
- File output: `app.log` (production)
- Includes: timestamp, level, message, user_id, endpoint, error details

View logs:
```bash
# Backend logs
docker-compose logs -f backend

# All services
docker-compose logs -f
```

## API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login with credentials
- `POST /auth/oauth-sync` - OAuth sync (Google/GitHub)

### Map
- `GET /map/heatmap?min_lat=&max_lat=&min_lng=&max_lng=` - Get heatmap data
- `GET /map/pins?min_lat=&max_lat=&min_lng=&max_lng=` - Get pins in viewport

### Pins
- `POST /pins` - Create pin (requires auth, checks mute status)
- `GET /pins/{id}` - Get pin details
- `POST /pins/{id}/inspire` - Inspire a pin (requires auth, checks mute status, rate limited)

### Admin (Requires ADMIN role)
- `GET /admin/reports` - List all reports
- `GET /admin/users` - List all users
- `POST /admin/users/{user_id}/shadow-ban` - Toggle shadow ban
- `POST /admin/users/{user_id}/mute` - Toggle mute
- `GET /admin/settings/star-map` - Get star map visibility
- `POST /admin/settings/star-map` - Toggle star map visibility

### Health
- `GET /health` - Health check (no auth required)

## Development vs Production

### Development Mode
- Environment: `ENVIRONMENT=development`
- Logging: Console output
- Rate limiting: Enabled but more lenient
- CORS: Allows localhost origins

### Production Mode
- Environment: `ENVIRONMENT=production`
- Logging: JSON file + console
- Rate limiting: Strict limits enforced
- CORS: Configure allowed origins
- SSL: Configure SSL certificates in nginx.conf

## Troubleshooting

### Database Connection Issues
```bash
# Check PostgreSQL is running
docker-compose ps postgres

# Check connection
docker-compose exec postgres psql -U egilsmap -d egilsmap -c "SELECT 1;"
```

### Redis Connection Issues
```bash
# Check Redis is running
docker-compose ps redis

# Test Redis connection
docker-compose exec redis redis-cli ping
```

### Migration Issues
```bash
# Check migration status
cd backend
alembic current

# View migration history
alembic history

# Rollback if needed (be careful!)
alembic downgrade -1
```

### Admin Access Issues
1. Verify user exists: `SELECT id, username, role FROM users;`
2. Update role: `UPDATE users SET role = 'ADMIN' WHERE username = 'your_username';`
3. Clear browser cache and re-login

### Rate Limiting Issues
- Check logs for rate limit errors
- Adjust limits in `backend/app/core/rate_limit.py` if needed
- Nginx also enforces rate limits (check nginx.conf)

## Next Steps

1. **Set up SSL certificates** for production (uncomment HTTPS section in nginx.conf)
2. **Configure production S3** (AWS S3 instead of MinIO)
3. **Set up monitoring** (monitor `/health` endpoint)
4. **Configure backup strategy** for PostgreSQL
5. **Set up CI/CD** for automated deployments

## Support

For issues or questions:
- Check logs: `docker-compose logs -f backend`
- Check health: `curl http://localhost:8000/health`
- Review migration status: `alembic current`
