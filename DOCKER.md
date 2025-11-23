# Docker Setup for Zeiterfassung

## Quick Start

1. **Copy the environment file:**
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env` file:**
   - Set a strong `JWT_SECRET`
   - Update `FRONTEND_URL` if deploying to a different domain
   - Adjust `PORT` if needed (default: 5000)

3. **Create data directory:**
   ```bash
   mkdir data
   ```

4. **Build and start:**
   ```bash
   docker-compose up -d
   ```

5. **Access the application:**
   - Open http://localhost:5000 in your browser

## Database Persistence

The SQLite database is stored in `./data/time_tracking.db` on your host machine. This ensures:
- Data persists across container restarts
- Easy backup (just copy the `data` folder)
- Database can be accessed directly from the host

## Environment Variables

All configuration is managed through the `.env` file:

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Application port | 5000 |
| `JWT_SECRET` | Secret key for JWT tokens | (required) |
| `FRONTEND_URL` | Frontend URL for CORS | http://localhost:5000 |
| `NODE_ENV` | Environment mode | production |

## Useful Commands

**View logs:**
```bash
docker-compose logs -f
```

**Stop the application:**
```bash
docker-compose down
```

**Rebuild after code changes:**
```bash
docker-compose up -d --build
```

**Access container shell:**
```bash
docker-compose exec zeiterfassung sh
```

## Backup

To backup your data:
```bash
# Stop the container
docker-compose down

# Copy the data directory
cp -r data data-backup-$(date +%Y%m%d)

# Restart
docker-compose up -d
```

## Restore

To restore from backup:
```bash
# Stop the container
docker-compose down

# Restore data directory
rm -rf data
cp -r data-backup-YYYYMMDD data

# Restart
docker-compose up -d
```
