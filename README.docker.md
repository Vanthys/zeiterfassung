# Zeiterfassung - Docker Setup

## Overview

This Docker setup includes:
- **Single Container Architecture**: Frontend (React) is built and served by the backend
- **External Database Mount**: Database stored in `./data` directory on host
- **Environment File**: All configuration via `.env` file

The Dockerfile builds the React frontend and the Node.js backend serves both the API and the static frontend files.

## Quick Start

```bash
# 1. Copy environment template
cp .env.example .env

# 2. Edit .env and set your JWT_SECRET
nano .env

# 3. Create data directory
mkdir data

# 4. Start the application
docker-compose up -d

# 5. Access at http://localhost:5000
```

## Configuration

Edit `.env` file to customize:

```env
PORT=5000                              # Application port
JWT_SECRET=your-secret-key             # CHANGE THIS!
FRONTEND_URL=http://localhost:5000     # For CORS
NODE_ENV=production
```

## Database

- **Location**: `./data/time_tracking.db` (on host)
- **Persistence**: Survives container restarts/rebuilds
- **Backup**: Just copy the `data/` folder

## Common Commands

```bash
# View logs
docker-compose logs -f

# Stop
docker-compose down

# Rebuild after code changes
docker-compose up -d --build

# Backup database
cp -r data data-backup-$(date +%Y%m%d)
```

See [DOCKER.md](./DOCKER.md) for detailed documentation.
