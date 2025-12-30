#!/bin/sh
set -e

echo "Running database migrations..."
npm run migration:run

echo ""
echo "Checking if database seeding is needed..."
npm run seed:prod

echo ""
echo "Database setup completed. Starting application..."
exec npm run start:prod

