#!/bin/sh
set -e

echo "=== Zeiterfassung Container Starting ==="
echo "Working directory: $(pwd)"
echo "Prisma directory contents:"
ls -la /app/prisma/ || echo "Prisma directory not found"

echo ""
echo "=== Running database migrations ==="
cd /app
npx prisma migrate deploy --schema=/app/prisma/schema.prisma || {
    echo "Migration failed, but continuing to start server..."
    echo "You may need to run migrations manually"
}

echo ""
echo "=== Starting server ==="
exec node server.js
