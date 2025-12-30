#!/bin/sh
set -e

echo "🔄 Running database migrations..."
npm run migration:run

echo "✅ Migrations completed. Starting application..."
exec npm run start:prod

