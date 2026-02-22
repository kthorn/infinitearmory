# Component 9: Fly Deployment Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Configure and deploy the application to Fly.io with persistent volume storage for SQLite.

**Architecture:** Single Next.js server on Fly.io with persistent volume at /data. SQLite database on volume. Prisma migrations run at deploy time. Secrets managed via Fly.

**Tech Stack:** Fly.io, Docker

**Prerequisites:** Components 7 (API Routes — `/api/health` endpoint), 10 (Auth & Rate Limiting — middleware), and 2 (Database — Prisma migrations) must be implemented before deploying.

---

## Task 1: Install Fly CLI

**Files:** None (system setup)

**Step 1: Install Fly CLI**

Run:
```bash
# On macOS/Linux
curl -L https://fly.io/install.sh | sh
```

Or via Homebrew:
```bash
brew install flyctl
```

**Step 2: Verify installation**

Run:
```bash
fly version
```

Expected: Version number displayed.

**Step 3: Login to Fly**

Run:
```bash
fly auth login
```

Expected: Browser opens for authentication.

---

## Task 2: Create Fly Configuration

**Files:**
- Create: `fly.toml`

**Step 1: Create fly.toml**

Create file `fly.toml`:

```toml
# fly.toml - Fly.io configuration
app = "weapon-gen"
primary_region = "sjc"

[build]
  dockerfile = "Dockerfile"

[deploy]
  release_command = "npx prisma migrate deploy"

[env]
  NODE_ENV = "production"
  DATABASE_URL = "file:/data/app.db"
  PORT = "3000"

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = false
  auto_start_machines = true
  min_machines_running = 1
  processes = ["app"]

[[http_service.checks]]
  grace_period = "10s"
  interval = "30s"
  method = "GET"
  path = "/api/health"
  timeout = "5s"

[mounts]
  source = "weapon_data"
  destination = "/data"

[[vm]]
  memory = "1gb"
  cpu_kind = "shared"
  cpus = 1
```

**Step 2: Commit**

Run:
```bash
git add fly.toml && git commit -m "feat: add Fly.io configuration"
```

---

## Task 3: Create Dockerfile

**Files:**
- Create: `Dockerfile`

**Step 1: Create Dockerfile**

Create file `Dockerfile`:

```dockerfile
# syntax=docker/dockerfile:1

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build Next.js
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Install SQLite for backup commands and su-exec for user switching
RUN apk add --no-cache sqlite su-exec

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built assets
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy Prisma files for migrations (needed by release_command)
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

# Create data directory (ownership handled at runtime via entrypoint)
RUN mkdir -p /data/backups

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Entrypoint: fix volume ownership then drop to non-root
# Fly mounts the volume as root, so we chown at startup before switching user
CMD ["sh", "-c", "chown -R nextjs:nodejs /data && exec su-exec nextjs node server.js"]
```

**Step 2: Commit**

Run:
```bash
git add Dockerfile && git commit -m "feat: add production Dockerfile"
```

---

## Task 4: Create .dockerignore

**Files:**
- Create: `.dockerignore`

**Step 1: Create .dockerignore**

Create file `.dockerignore`:

```
# Dependencies
node_modules

# Build outputs
.next
out

# Git
.git
.gitignore

# IDE
.vscode
.idea

# Local env files
.env
.env.local
.env*.local

# SQLite databases
*.db
*.db-journal
*.db-wal
*.db-shm

# Test files
**/__tests__
**/*.test.ts
**/*.spec.ts
coverage

# Misc
*.md
!README.md
.DS_Store
*.log
```

**Step 2: Commit**

Run:
```bash
git add .dockerignore && git commit -m "chore: add .dockerignore"
```

---

## Task 5: Update Next.js Config for Standalone

**Files:**
- Modify: `next.config.ts`

**Step 1: Enable standalone output**

Update `next.config.ts`:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: '**.r2.dev',
      },
      {
        protocol: 'https',
        hostname: '**.r2.cloudflarestorage.com',
      },
    ],
  },
};

export default nextConfig;
```

**Step 2: Commit**

Run:
```bash
git add next.config.ts && git commit -m "feat: enable standalone output for production"
```

---

## Task 6: Create Deploy Script

**Files:**
- Create: `scripts/deploy.sh`

**Step 1: Create deploy script**

Create file `scripts/deploy.sh`:

```bash
#!/bin/bash
set -e

echo "🚀 Deploying to Fly.io..."

# Ensure we're on a clean git state
if [[ -n $(git status --porcelain) ]]; then
  echo "⚠️  Warning: You have uncommitted changes"
  read -p "Continue anyway? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Run build (includes type checking)
echo "📝 Running build..."
npm run build

# Deploy to Fly
echo "🛫 Deploying to Fly.io..."
fly deploy

# Show app status
echo ""
echo "✅ Deployment complete!"
echo ""
fly status

echo ""
echo "🔗 App URL: https://weapon-gen.fly.dev"
```

**Step 2: Make executable**

Run:
```bash
chmod +x scripts/deploy.sh
```

**Step 3: Commit**

Run:
```bash
git add scripts/deploy.sh && git commit -m "feat: add deploy script"
```

---

## Task 7: Create Fly App and Volume

**Files:** None (Fly.io setup)

**Step 1: Create Fly app**

Run:
```bash
fly apps create weapon-gen
```

Expected: App created message.

**Step 2: Create persistent volume**

Run:
```bash
fly volumes create weapon_data --region sjc --size 1
```

Expected: Volume created. This creates a 1GB volume for SQLite.

**Step 3: Verify resources**

Run:
```bash
fly apps list
fly volumes list --app weapon-gen
```

Expected: App and volume listed.

---

## Task 8: Configure Secrets

**Files:** None (Fly.io secrets)

**Step 1: Set required secrets**

Use `fly secrets import` to avoid leaking values into shell history:

```bash
# Create a temporary secrets file (do NOT commit this)
cat > /tmp/fly-secrets.env << 'EOF'
# AI Providers (set the ones you'll use)
TEXT_PROVIDER=openai
IMAGE_PROVIDER=openai
OPENAI_API_KEY=sk-...
# ANTHROPIC_API_KEY=sk-ant-...
# GEMINI_API_KEY=...

# S3 Storage
S3_BUCKET=your-bucket-name
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=AKIA...
S3_SECRET_ACCESS_KEY=...

# For Cloudflare R2, also set:
# S3_ENDPOINT=https://accountid.r2.cloudflarestorage.com
# S3_PUBLIC_URL=https://pub-hash.r2.dev

# Authentication
AUTH_PASSWORD=your-secure-password
EOF

# Import secrets from file
fly secrets import < /tmp/fly-secrets.env

# Delete the temporary file
rm /tmp/fly-secrets.env
```

**Step 2: Verify secrets**

Run:
```bash
fly secrets list
```

Expected: Secrets listed (values hidden).

---

## Task 9: Initial Deployment

**Files:** None (deployment)

**Step 1: Deploy the application**

Run:
```bash
fly deploy
```

Expected: Build and deploy succeeds. May take a few minutes.

**Step 2: Verify deployment**

Run:
```bash
fly status
```

Expected: App running with 1 machine.

**Step 3: Check logs**

Run:
```bash
fly logs
```

Expected: No errors, migrations run, server started.

**Step 4: Test health endpoint**

Run:
```bash
curl https://weapon-gen.fly.dev/api/health
```

Expected: `{"status":"healthy","timestamp":"..."}`

---

## Task 10: Verify Application

**Files:** None (verification)

**Step 1: Test authentication**

Run:
```bash
# Without auth should fail
curl -I https://weapon-gen.fly.dev/api/weapons

# With auth should succeed
curl -u ":your-password" https://weapon-gen.fly.dev/api/weapons
```

Expected: 401 without auth, 200 with auth.

**Step 2: Test generation (optional)**

Visit https://weapon-gen.fly.dev in browser with Basic Auth.

**Step 3: Verify database persistence**

Run:
```bash
fly ssh console
ls -la /data/
sqlite3 /data/app.db "SELECT COUNT(*) FROM Weapon;"
```

Expected: Database file exists, can query.

---

## Task 11: Create Deployment Documentation

**Files:**
- Create: `docs/deployment.md`

**Step 1: Create deployment documentation**

Create file `docs/deployment.md`:

```markdown
# Deployment Guide

## Prerequisites

- Fly.io account and CLI installed (`flyctl`)
- API keys for AI providers (OpenAI and/or Anthropic)
- S3-compatible storage (AWS S3 or Cloudflare R2)

## Initial Setup

### 1. Login to Fly

```bash
fly auth login
```

### 2. Create App and Volume

```bash
fly apps create weapon-gen
fly volumes create weapon_data --region sjc --size 1
```

### 3. Configure Secrets

```bash
# Create secrets file, fill in values, then import:
fly secrets import < secrets.env
# Required: TEXT_PROVIDER, IMAGE_PROVIDER, OPENAI_API_KEY (or ANTHROPIC_API_KEY/GEMINI_API_KEY)
# Required: S3_BUCKET, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY
# Required: AUTH_PASSWORD
```

### 4. Deploy

```bash
fly deploy
```

## Routine Deployments

```bash
./scripts/deploy.sh
```

Or manually:

```bash
npm run build
fly deploy
```

## Monitoring

### View Logs

```bash
fly logs
```

### Check Status

```bash
fly status
```

### SSH Access

```bash
fly ssh console
```

### Database Access

```bash
fly ssh console
sqlite3 /data/app.db
```

## Scaling

Currently configured for single instance (required for SQLite).

To increase memory/CPU:

```bash
fly scale memory 2048
fly scale vm shared-cpu-2x
```

## Backups

Backups run automatically every 6 hours and upload to S3.

Manual backup:

```bash
fly ssh console
sqlite3 /data/app.db ".backup /data/backups/manual-backup.db"
```

See `docs/runbooks/restore-from-backup.md` for restore procedures.

## Troubleshooting

### App won't start

1. Check logs: `fly logs`
2. Verify secrets: `fly secrets list`
3. Check volume: `fly volumes list`

### Database errors

1. SSH in: `fly ssh console`
2. Check file exists: `ls -la /data/app.db`
3. Check permissions: `stat /data/app.db`
4. Test query: `sqlite3 /data/app.db "PRAGMA integrity_check;"`

### Image generation fails

1. Check S3 credentials are correct
2. Verify bucket exists and is accessible
3. Check API key has sufficient quota
```

**Step 2: Commit**

Run:
```bash
git add docs/deployment.md && git commit -m "docs: add deployment guide"
```

---

## Task 12: Final Verification

**Files:** None (verification only)

**Step 1: Run full local build**

Run:
```bash
npm run build
```

Expected: Build succeeds.

**Step 2: Verify all files committed**

Run:
```bash
git status
```

Expected: Working tree clean.

**Step 3: Commit any remaining changes**

Run (only if there are uncommitted changes):
```bash
git add -A && git commit -m "chore: complete Fly deployment component"
```

---

## Component 9 Complete

**Summary of what was created:**
- `fly.toml` configuration with health checks
- Production Dockerfile with standalone output
- `.dockerignore` for efficient builds
- Deploy script
- Persistent volume for SQLite
- Secrets configuration
- Deployment documentation

**Deployment Commands:**
```bash
# Initial setup
fly apps create weapon-gen
fly volumes create weapon_data --region sjc --size 1
fly secrets set KEY=value

# Deploy
fly deploy

# Monitor
fly logs
fly status
fly ssh console
```

**App URL:** https://weapon-gen.fly.dev

---

**Next Steps:** After deployment, continue with remaining components (Auth & Rate Limiting, Backup System, Observability, S3 Storage) as needed.
