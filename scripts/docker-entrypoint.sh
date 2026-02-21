#!/bin/sh
set -e

echo "Starting Code Canvas Astro..."

# Start the Astro server
# Note: database init and seed are handled by the db-init container
# which is guaranteed to complete before this container starts
echo "Starting server..."
exec node /app/dist/server/entry.mjs
