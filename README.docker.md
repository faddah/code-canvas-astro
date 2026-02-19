# Docker Setup for Code Canvas Astro

This guide explains how to run the Code Canvas Astro application using Docker.

## Prerequisites

- Docker installed on your system
- Docker Compose installed (usually comes with Docker Desktop)

## Quick Start

### 1. Build and Start the Application

```bash
docker-compose up --build
```

This command will:

- Build the Docker image for the Astro app
- Create a private volume for the SQLite database
- Start the application on port 3000

### 2. Access the Application

Open your browser and navigate to:

```text
http://localhost:3000
```

### 3. Stop the Application

```bash
docker-compose down
```

To stop and remove volumes (this will delete your database):

```bash
docker-compose down -v
```

## Database Persistence

The SQLite database (`taskManagement.db`) is stored in a Docker volume named `db-data`. This volume:

- Persists data between container restarts
- Is private to the application container
- Survives even if the container is removed (unless you use `docker-compose down -v`)

## Running in Detached Mode

To run the application in the background:

```bash
docker-compose up -d
```

View logs:

```bash
docker-compose logs -f
```

## Development vs Production

- **Local Development**: Use `npm run dev` with the `.env` file
- **Docker Production**: Use `docker-compose up` which uses the production environment

## Useful Commands

### Rebuild the image

```bash
docker-compose build --no-cache
```

### View running containers

```bash
docker-compose ps
```

### Execute commands in the container

```bash
docker-compose exec app sh
```

### View database volume location

```bash
docker volume inspect code-canvas-astro_db-data
```

## Database Migrations

If you need to run database migrations in Docker:

```bash
docker-compose exec app npm run db:migrate
```

## Troubleshooting

### Port already in use

If port 3000 is already in use, edit `docker-compose.yml` and change:

```yaml
ports:
  - "3001:3000"  # Use port 3001 on host instead
```

### Database not persisting

Make sure you're not using the `-v` flag when stopping:

```bash
docker-compose down  # Good - keeps volumes
docker-compose down -v  # Bad - removes volumes
```

### View container logs

```bash
docker-compose logs app
```

## Architecture

- **App Container**: Runs the Astro application with Node.js
- **Database Volume**: Isolated volume for SQLite database file
- **Network**: Private bridge network for the application

## Note on SQLite

SQLite is a file-based database that runs within the application process, not as a separate server. The database file is stored in a Docker volume (`/app/data/taskManagement.db`) which provides:

- Data persistence
- Isolation from the host system
- Easy backup and restore capabilities

If you need a true client-server database (PostgreSQL, MySQL), that would require a different setup with a separate database container.
