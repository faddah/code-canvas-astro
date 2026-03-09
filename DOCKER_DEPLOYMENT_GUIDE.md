# Code Canvas Astro — Docker & AWS Deployment Guide

## Architecture

### Local Development (Docker Compose)

```text
┌─────────────────────────────────────────┐
│  docker-compose.yml                     │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────────────────────────────────┐   │
│  │     app container               │   │
│  │     (code-canvas-astro-app)     │   │
│  │     :3000                       │   │
│  │                                 │   │
│  │  Astro 5 SSR ─── Turso Cloud   │   │
│  └──────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

- **app container**: Runs the Astro production server on port 3000
- **Turso cloud DB**: Remote libSQL database — no local files or volumes needed

### AWS Deployment (Lambda + API Gateway + CloudFront)

```text
┌──────────────────────────────────────────────────────────┐
│  AWS Infrastructure                                       │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  Route 53 (pyrepl.dev)                                    │
│       │                                                   │
│  CloudFront (E8UQ2BAGKYYM0)                               │
│       │                                                   │
│  API Gateway v2 (HTTP API)                                │
│       │                                                   │
│  Lambda Function (code-canvas-astro-lambda)               │
│  ├─ Container Image from ECR                              │
│  ├─ lambda-handler.cjs → Astro Server (port 8080)         │
│  └─ Connects to Turso cloud DB via env vars               │
│                                                           │
│  Turso Cloud Database (pyrepl-db)                         │
│  └─ libsql://pyrepl-db-*.turso.io                         │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

How it works:

1. **Cold Start**: Lambda starts the Astro Node.js server on port 8080
2. **Requests**: API Gateway v2 routes HTTPS traffic to the Lambda function
3. **Database**: Astro connects to Turso via `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` environment variables — no local file management needed
4. **CDN**: CloudFront caches responses and terminates TLS for the `pyrepl.dev` domain
5. **DNS**: Route 53 points `pyrepl.dev` to the CloudFront distribution

---

## Quick Start — Local Development

### Local Prerequisites

- **Node.js** v22+
- **Docker** and **Docker Compose**
- **Turso CLI** (`brew install tursodatabase/tap/turso` or see [Turso](https://turso.tech))

### 1. Set up environment variables

Create a `.env` file in the project root:

```bash
TURSO_DATABASE_URL=libsql://your-db-name-your-org.turso.io
TURSO_AUTH_TOKEN=your-turso-auth-token
PUBLIC_CLERK_PUBLISHABLE_KEY=your-clerk-publishable-key
CLERK_SECRET_KEY=your-clerk-secret-key
```

### 2. Start the application

```bash
docker-compose up --build
```

This builds and starts a single container that connects to your Turso cloud database.

### 3. Access the application

Open `http://localhost:3000` in your browser.

### 4. Stop the application

```bash
docker-compose down
```

---

## AWS Lambda Deployment

### AWS Prerequisites

```bash
# Install Python dependencies
pip install boto3 botocore

# Configure AWS credentials
aws configure
# Enter:
# - AWS Access Key ID
# - AWS Secret Access Key
# - Default region: us-west-2
# - Default output format: json

# Verify credentials
aws sts get-caller-identity
```

### Environment Variables Required

The deployment script reads these from your environment:

| Variable | Description |
| -------- | ----------- |
| `TURSO_DATABASE_URL` | Your Turso database URL (`libsql://...`) |
| `TURSO_AUTH_TOKEN` | Turso authentication token |
| `PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key (baked in at build time) |
| `CLERK_SECRET_KEY` | Clerk secret key |

### Deploy

```bash
cd "/Users/faddah/Documents/code/code - projects/code-canvas-astro"
python3 update_aws_deployment.py
```

### 11-Stage Deployment Pipeline

The `update_aws_deployment.py` script runs these stages:

| Stage | Description |
| ----- | ----------- |
| 1 | Build app container image (multi-stage Docker build) |
| 2 | Build Lambda container image |
| 3 | Push app image to Docker Hub |
| 4 | Push Lambda image to ECR |
| 5 | Create/update Lambda function with Turso env vars |
| 6 | Create/update API Gateway v2 (HTTP API) integration |
| 7 | Create/update API Gateway routes and stage |
| 8 | Create/update CloudFront distribution |
| 9 | Create/update Route 53 DNS records |
| 10 | Verify deployment health checks |
| 11 | Print deployment summary |

### AWS Resources

| Resource | Value |
| -------- | ----- |
| Region | `us-west-2` |
| Account | `415740581749` |
| Lambda function | `code-canvas-astro-lambda` |
| ECR repository | `python-repl-container-lambda` |
| CloudFront distribution | `E8UQ2BAGKYYM0` |
| Route 53 zone | `pyrepl.dev` (Z06161484WRKVMIQUBIG) |
| Docker Hub user | `faddah` |

---

## Key Configuration Files

### docker-compose.yml

Single-service setup. The `app` container builds from `Dockerfile`, exposes port 3000, and passes Turso + Clerk environment variables through.

### Dockerfile (Local / Docker Compose)

Multi-stage build using `node:22-bookworm-slim`:

1. **Builder stage** — installs all dependencies, builds the Astro app
2. **Runtime stage** — installs production dependencies only, copies built `dist/`, runs on port 3000

### Dockerfile.lambda (AWS Lambda)

Multi-stage build:

1. **Builder stage** — `node:22-alpine`, builds the Astro app
2. **Runtime stage** — `public.ecr.aws/lambda/nodejs:20`, copies built app + `lambda-handler.cjs`, runs on port 8080

### lambda-handler.cjs

Lambda entry point that:

- Spawns the Astro Node.js server on cold start
- Proxies API Gateway v2 events to the local Astro server
- Reconstructs cookies for Clerk authentication
- Returns responses in Lambda's expected format

### drizzle.config.ts

Configured with `dialect: "turso"` using `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` credentials.

### astro.config.mjs

- `output: 'server'` (full SSR)
- `security.checkOrigin: false` (Clerk handles CSRF protection)
- Integrations: Clerk, React 19, Tailwind CSS 4
- Adapter: `@astrojs/node` (standalone mode)

---

## Database — Turso (libSQL)

### Why Turso?

The project migrated from SQLite (with S3 persistence) to Turso to eliminate:

- S3 download/upload latency on Lambda cold starts
- Concurrency limitations (Lambda reserved concurrency = 1)
- Data loss risks from Lambda's ephemeral `/tmp` storage

Turso provides:

- Cloud-hosted libSQL (SQLite-compatible) with edge replicas
- Native concurrent access from multiple Lambda instances
- No local file management — just connect via URL + auth token
- Free tier sufficient for moderate traffic

### Schema

```sql
CREATE TABLE files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
```

### Drizzle Commands

```bash
npm run db:push       # Push schema changes to Turso
npm run db:generate   # Generate migration files
npm run db:migrate    # Run pending migrations
npm run db:studio     # Open Drizzle Studio GUI
```

---

## Troubleshooting

### Local Development Issues

**Container won't start:**

```bash
docker-compose logs app
docker-compose down
docker-compose up --build --force-recreate
```

**Port 3000 already in use:**

```bash
lsof -i :3000
kill -9 <PID>
```

**Database connection errors:**

- Verify `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` in `.env`
- Test connection: `turso db shell your-db-name`
- Check that your auth token hasn't expired: `turso db tokens create your-db-name`

### AWS Lambda Issues

**Cold start timeouts:**

```bash
# Check Lambda logs
aws logs tail /aws/lambda/code-canvas-astro-lambda --follow --region us-west-2
```

**Docker push to ECR fails:**

```bash
# Re-authenticate with ECR
aws ecr get-login-password --region us-west-2 | \
  docker login --username AWS --password-stdin \
  415740581749.dkr.ecr.us-west-2.amazonaws.com
```

**403 errors on API routes:**

- Check that `security.checkOrigin` is `false` in `astro.config.mjs`
- Verify Clerk environment variables are set in Lambda configuration

**Permission denied:**

```bash
aws iam get-user

# Your IAM user needs permissions for:
# - ECR (ecr:*)
# - Lambda (lambda:*)
# - IAM (iam:CreateRole, iam:AttachRolePolicy)
# - API Gateway (apigateway:*, apigatewayv2:*)
# - CloudFront (cloudfront:*)
# - Route 53 (route53:*)
```

---

## Cost Estimate

### Lambda + Turso (Current)

| Service | Cost |
| ------- | ---- |
| Lambda requests | ~$0.20 per 1M requests |
| Lambda duration | ~$0.0000166667 per GB-second |
| ECR storage | ~$0.10 per GB-month |
| CloudFront | Varies by traffic |
| Turso | Free tier (500 DBs, 9GB storage, 25M rows read/month) |
| **Estimated total** | **~$2-5/month for moderate traffic** |

---

## Security

### Credentials

- AWS credentials via `aws configure` (never committed to git)
- Turso auth token via environment variable
- Clerk keys via environment variable

### Authentication

- Clerk handles user authentication and session management
- Clerk session tokens provide CSRF protection
- `security.checkOrigin: false` is safe because Clerk validates requests

### Lambda Security

- Least-privilege IAM execution role
- CloudWatch logging enabled
- ECR image scanning on push
- HTTPS enforced via CloudFront

---

Built with Astro 5, React 19, Turso, Docker, AWS ECR, AWS Lambda, AWS API Gateway, AWS CloudFront and AWS Route53.
