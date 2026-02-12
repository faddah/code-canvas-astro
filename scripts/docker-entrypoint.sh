#!/bin/sh
set -e

echo "Starting Code Canvas Astro..."

# Initialize the database if needed
echo "Initializing database..."
node /app/scripts/init-db.js

# Start the Astro server
echo "Starting server..."
exec node /app/dist/server/entry.mjs --host
