# Deployment Guide

## Prerequisites

- Fly.io account and CLI installed (`flyctl`)
- API keys for AI providers (OpenAI and/or Anthropic/Gemini)
- (Optional) S3-compatible storage (AWS S3 or Cloudflare R2) — only needed if S3 Storage component is enabled

## Initial Setup

### 1. Login to Fly

```bash
fly auth login
```

### 2. Create App and Volume

```bash
fly apps create infinitearmory
fly volumes create weapon_data --region sjc --size 1
```

### 3. Configure Secrets

```bash
# Use a temporary file to avoid leaking secrets into shell history.
# See Task 8 in the deployment plan for the full workflow.
#
# Required secrets:
#   TEXT_PROVIDER, IMAGE_PROVIDER, AUTH_PASSWORD
#   OPENAI_API_KEY (or ANTHROPIC_API_KEY / GEMINI_API_KEY)
#
# Optional (when S3 Storage component is enabled):
#   S3_BUCKET, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY
#   S3_ENDPOINT, S3_PUBLIC_URL (for Cloudflare R2)
```

### 4. Deploy

```bash
fly deploy
```

## Routine Deployments

```bash
# Using the deploy script (runs a local build first to catch errors, then deploys)
./scripts/deploy.sh

# Or deploy directly (builds inside Docker)
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

> **Note:** Automated backups require the Backup System component to be implemented. Until then, use manual backups.

Manual backup:

```bash
fly ssh console -C 'sqlite3 /data/app.db ".backup /data/backups/manual-backup.db"'
```

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

1. Check AI provider API key has sufficient quota
2. Verify TEXT_PROVIDER and IMAGE_PROVIDER match your configured keys
3. For local storage: check `/data/uploads` directory exists and is writable
4. For S3 storage: check S3 credentials and verify bucket is accessible
