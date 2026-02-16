#!/bin/sh
set -e

echo "Starting Code Canvas Astro..."

# Initialize the database schema if needed
echo "Initializing database schema..."
node /app/scripts/init-db.js

# Seed the database with initial data if empty
echo "Seeding database..."
node /app/scripts/seed-db.js

# Start the Astro server
echo "Starting server..."
exec node /app/dist/server/entry.mjs --host
