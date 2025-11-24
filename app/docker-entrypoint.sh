#!/bin/sh
set -e

echo "=== Zeiterfassung Container Starting ==="
echo "Working directory: $(pwd)"
echo "Checking Prisma files..."
ls -la /app/prisma/

echo ""
echo "=== Running database migrations ==="
cd /app
echo "Running: npx prisma migrate deploy --schema=/app/prisma/schema.prisma"
npx prisma migrate deploy --schema=/app/prisma/schema.prisma 2>&1 || {
    echo "ERROR: Migration failed!"
    echo "Attempting to show migration status..."
    npx prisma migrate status --schema=/app/prisma/schema.prisma 2>&1 || true
    echo "Continuing to start server anyway..."
}

echo ""
echo "=== Checking database tables ==="
echo "Database file location:"
ls -la /app/prisma/time_tracking.db || echo "Database file not found"

echo ""
echo "=== Starting server ==="
exec node server.js
