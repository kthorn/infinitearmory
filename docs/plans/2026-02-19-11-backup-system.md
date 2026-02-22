# Component 11: Backup System Implementation Plan (Deferrable)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement automated SQLite backups to S3 with scheduling, compression, and retention policies.

**Architecture:** In-app scheduler using Node.js timers. SQLite .backup command for consistent snapshots. Gzip compression before upload. Timestamp-based keys with retention cleanup.

**Tech Stack:** Node.js child_process, zlib, AWS SDK S3

---

## Task 1: Create SQLite Backup Function

**Files:**
- Create: `src/lib/backup/sqlite-backup.ts`

**Step 1: Create backup function**

Create file `src/lib/backup/sqlite-backup.ts`:

```typescript
import { execSync } from 'child_process'
import { createReadStream, createWriteStream, existsSync, mkdirSync, unlinkSync } from 'fs'
import { createGzip } from 'zlib'
import { pipeline } from 'stream/promises'
import { join } from 'path'
import { env } from '@/lib/env'

const BACKUP_DIR = '/data/backups'

export interface BackupResult {
  filename: string
  filepath: string
  compressedPath: string
  sizeBytes: number
  timestamp: Date
}

/**
 * Create a SQLite backup using the .backup command
 * Returns the path to the compressed backup file
 */
export async function createSqliteBackup(): Promise<BackupResult> {
  const timestamp = new Date()
  const dateStr = formatTimestamp(timestamp)
  const filename = `app-${dateStr}.db`
  const compressedFilename = `${filename}.gz`

  // Ensure backup directory exists
  if (!existsSync(BACKUP_DIR)) {
    mkdirSync(BACKUP_DIR, { recursive: true })
  }

  const filepath = join(BACKUP_DIR, filename)
  const compressedPath = join(BACKUP_DIR, compressedFilename)

  // Get database path from DATABASE_URL
  const dbPath = getDatabasePath()

  // Create backup using SQLite .backup command
  // This creates a consistent snapshot even while the DB is in use
  execSync(`sqlite3 "${dbPath}" ".backup '${filepath}'"`, {
    timeout: 60000, // 1 minute timeout
  })

  // Compress the backup
  await compressFile(filepath, compressedPath)

  // Remove uncompressed file
  unlinkSync(filepath)

  // Get compressed file size
  const stats = await import('fs').then((fs) => fs.promises.stat(compressedPath))

  return {
    filename: compressedFilename,
    filepath,
    compressedPath,
    sizeBytes: stats.size,
    timestamp,
  }
}

/**
 * Compress a file using gzip
 */
async function compressFile(inputPath: string, outputPath: string): Promise<void> {
  const source = createReadStream(inputPath)
  const destination = createWriteStream(outputPath)
  const gzip = createGzip({ level: 9 })

  await pipeline(source, gzip, destination)
}

/**
 * Format timestamp for backup filename
 * Format: YYYYMMDD-HHMM
 */
function formatTimestamp(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')

  return `${year}${month}${day}-${hours}${minutes}`
}

/**
 * Extract database path from DATABASE_URL
 */
function getDatabasePath(): string {
  const url = env.DATABASE_URL

  if (url.startsWith('file:')) {
    return url.slice(5)
  }

  return url
}
```

**Step 2: Verify compilation**

Run:
```bash
npx tsc --noEmit
```

Expected: No errors.

**Step 3: Commit**

Run:
```bash
git add src/lib/backup/sqlite-backup.ts && git commit -m "feat: add SQLite backup function"
```

---

## Task 2: Create S3 Upload Function

**Files:**
- Create: `src/lib/backup/s3-upload.ts`

**Step 1: Create S3 upload for backups**

Create file `src/lib/backup/s3-upload.ts`:

```typescript
import { PutObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3'
import { createReadStream } from 'fs'
import { getS3Client, getS3Bucket } from '@/lib/storage/s3-client'
import { isS3Configured } from '@/lib/env'

const BACKUP_PREFIX = 'sqlite-backups/'

export interface UploadBackupResult {
  key: string
  bucket: string
}

/**
 * Upload a backup file to S3
 */
export async function uploadBackupToS3(
  filepath: string,
  filename: string
): Promise<UploadBackupResult> {
  if (!isS3Configured()) {
    throw new Error('S3 is not configured for backups')
  }

  const s3 = getS3Client()
  const bucket = getS3Bucket()
  const key = `${BACKUP_PREFIX}${filename}`

  const fileStream = createReadStream(filepath)

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: fileStream,
      ContentType: 'application/gzip',
      ContentEncoding: 'gzip',
    })
  )

  return { key, bucket }
}

/**
 * List all backup files in S3
 */
export async function listBackups(): Promise<Array<{ key: string; lastModified: Date; size: number }>> {
  if (!isS3Configured()) {
    return []
  }

  const s3 = getS3Client()
  const bucket = getS3Bucket()

  const response = await s3.send(
    new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: BACKUP_PREFIX,
    })
  )

  return (
    response.Contents?.map((obj) => ({
      key: obj.Key!,
      lastModified: obj.LastModified!,
      size: obj.Size!,
    })) ?? []
  )
}

/**
 * Delete backup files from S3
 */
export async function deleteBackups(keys: string[]): Promise<void> {
  if (!isS3Configured() || keys.length === 0) {
    return
  }

  const s3 = getS3Client()
  const bucket = getS3Bucket()

  await s3.send(
    new DeleteObjectsCommand({
      Bucket: bucket,
      Delete: {
        Objects: keys.map((key) => ({ Key: key })),
      },
    })
  )
}
```

**Step 2: Verify compilation**

Run:
```bash
npx tsc --noEmit
```

Expected: No errors.

**Step 3: Commit**

Run:
```bash
git add src/lib/backup/s3-upload.ts && git commit -m "feat: add S3 backup upload"
```

---

## Task 3: Create Retention Policy

**Files:**
- Create: `src/lib/backup/retention.ts`

**Step 1: Create retention policy**

Create file `src/lib/backup/retention.ts`:

```typescript
import { listBackups, deleteBackups } from './s3-upload'

interface RetentionConfig {
  dailyBackups: number // Keep N most recent daily backups
  weeklyBackups: number // Keep N most recent weekly backups (Sunday)
}

const DEFAULT_RETENTION: RetentionConfig = {
  dailyBackups: 14, // 2 weeks of daily
  weeklyBackups: 8, // 2 months of weekly
}

/**
 * Apply retention policy to backups
 * Keeps recent daily backups and weekly backups (oldest on each Sunday)
 */
export async function applyRetentionPolicy(
  config: RetentionConfig = DEFAULT_RETENTION
): Promise<{ deleted: number; kept: number }> {
  const backups = await listBackups()

  if (backups.length === 0) {
    return { deleted: 0, kept: 0 }
  }

  // Sort by date, newest first
  const sorted = backups.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime())

  const toKeep = new Set<string>()
  const dailyKept: string[] = []
  const weeklyKept: string[] = []

  // Track which days/weeks we've already kept
  const keptDays = new Set<string>()
  const keptWeeks = new Set<string>()

  for (const backup of sorted) {
    const date = backup.lastModified
    const dayKey = formatDay(date)
    const weekKey = formatWeek(date)
    const isSunday = date.getDay() === 0

    // Keep as daily backup (one per day, up to limit)
    if (!keptDays.has(dayKey) && dailyKept.length < config.dailyBackups) {
      toKeep.add(backup.key)
      dailyKept.push(backup.key)
      keptDays.add(dayKey)
    }

    // Keep as weekly backup (Sunday only, one per week, up to limit)
    if (isSunday && !keptWeeks.has(weekKey) && weeklyKept.length < config.weeklyBackups) {
      toKeep.add(backup.key)
      weeklyKept.push(backup.key)
      keptWeeks.add(weekKey)
    }
  }

  // Delete backups not in keep set
  const toDelete = sorted.filter((b) => !toKeep.has(b.key)).map((b) => b.key)

  if (toDelete.length > 0) {
    await deleteBackups(toDelete)
  }

  return {
    deleted: toDelete.length,
    kept: toKeep.size,
  }
}

function formatDay(date: Date): string {
  return date.toISOString().split('T')[0]!
}

function formatWeek(date: Date): string {
  // Get ISO week number
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${d.getUTCFullYear()}-W${weekNo}`
}
```

**Step 2: Verify compilation**

Run:
```bash
npx tsc --noEmit
```

Expected: No errors.

**Step 3: Commit**

Run:
```bash
git add src/lib/backup/retention.ts && git commit -m "feat: add backup retention policy"
```

---

## Task 4: Create Backup Scheduler

**Files:**
- Create: `src/lib/backup/scheduler.ts`

**Step 1: Create scheduler**

Create file `src/lib/backup/scheduler.ts`:

```typescript
import { createSqliteBackup } from './sqlite-backup'
import { uploadBackupToS3 } from './s3-upload'
import { applyRetentionPolicy } from './retention'
import { isS3Configured } from '@/lib/env'
import { unlinkSync } from 'fs'

// Backup interval: 6 hours in milliseconds
const BACKUP_INTERVAL_MS = 6 * 60 * 60 * 1000

let schedulerInterval: NodeJS.Timeout | null = null
let isRunning = false

/**
 * Run a single backup cycle
 */
export async function runBackup(): Promise<void> {
  if (isRunning) {
    console.log('[Backup] Backup already in progress, skipping')
    return
  }

  isRunning = true
  const startTime = Date.now()

  try {
    console.log('[Backup] Starting backup...')

    // Create local backup
    const backup = await createSqliteBackup()
    console.log(`[Backup] Created local backup: ${backup.filename} (${formatBytes(backup.sizeBytes)})`)

    // Upload to S3 if configured
    if (isS3Configured()) {
      const result = await uploadBackupToS3(backup.compressedPath, backup.filename)
      console.log(`[Backup] Uploaded to S3: ${result.key}`)

      // Clean up local file after successful upload
      try {
        unlinkSync(backup.compressedPath)
      } catch {
        // Ignore cleanup errors
      }

      // Apply retention policy
      const retention = await applyRetentionPolicy()
      console.log(`[Backup] Retention: kept ${retention.kept}, deleted ${retention.deleted}`)
    } else {
      console.log('[Backup] S3 not configured, keeping local backup only')
    }

    const duration = Date.now() - startTime
    console.log(`[Backup] Completed in ${duration}ms`)
  } catch (error) {
    console.error('[Backup] Failed:', error)
  } finally {
    isRunning = false
  }
}

/**
 * Start the backup scheduler
 */
export function startBackupScheduler(): void {
  if (schedulerInterval) {
    console.log('[Backup] Scheduler already running')
    return
  }

  console.log(`[Backup] Starting scheduler (interval: ${BACKUP_INTERVAL_MS / 1000 / 60} minutes)`)

  // Run initial backup after a short delay
  setTimeout(() => {
    runBackup().catch(console.error)
  }, 5000)

  // Schedule recurring backups
  schedulerInterval = setInterval(() => {
    runBackup().catch(console.error)
  }, BACKUP_INTERVAL_MS)
}

/**
 * Stop the backup scheduler
 */
export function stopBackupScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval)
    schedulerInterval = null
    console.log('[Backup] Scheduler stopped')
  }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
```

**Step 2: Verify compilation**

Run:
```bash
npx tsc --noEmit
```

Expected: No errors.

**Step 3: Commit**

Run:
```bash
git add src/lib/backup/scheduler.ts && git commit -m "feat: add backup scheduler"
```

---

## Task 5: Create Backup Module Index

**Files:**
- Create: `src/lib/backup/index.ts`

**Step 1: Create backup index**

Create file `src/lib/backup/index.ts`:

```typescript
export { createSqliteBackup, type BackupResult } from './sqlite-backup'
export { uploadBackupToS3, listBackups, deleteBackups } from './s3-upload'
export { applyRetentionPolicy } from './retention'
export { runBackup, startBackupScheduler, stopBackupScheduler } from './scheduler'
```

**Step 2: Remove .gitkeep**

Run:
```bash
rm -f src/lib/backup/.gitkeep
```

**Step 3: Verify compilation**

Run:
```bash
npx tsc --noEmit
```

Expected: No errors.

**Step 4: Commit**

Run:
```bash
git add src/lib/backup && git commit -m "feat: add backup module index"
```

---

## Task 6: Initialize Scheduler on App Start

**Files:**
- Create: `src/lib/startup.ts`

**Step 1: Create startup module**

Create file `src/lib/startup.ts`:

```typescript
import { startBackupScheduler } from './backup'
import { env } from './env'

let initialized = false

/**
 * Initialize background services
 * Called once on app startup
 */
export function initializeServices(): void {
  if (initialized) {
    return
  }

  initialized = true

  // Start backup scheduler in production
  if (env.NODE_ENV === 'production') {
    startBackupScheduler()
  } else {
    console.log('[Startup] Skipping backup scheduler in development')
  }
}
```

**Step 2: Update root layout to call startup**

Modify `src/app/layout.tsx` to add startup initialization:

```typescript
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { initializeServices } from '@/lib/startup'

const inter = Inter({ subsets: ['latin'] })

// Initialize services (runs once per server start)
if (typeof window === 'undefined') {
  initializeServices()
}

export const metadata: Metadata = {
  title: 'Fantasy Weapon Generator',
  description: 'Generate unique fantasy weapons with AI-powered descriptions, stats, and artwork',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
```

**Step 3: Verify compilation**

Run:
```bash
npx tsc --noEmit
```

Expected: No errors.

**Step 4: Commit**

Run:
```bash
git add src/lib/startup.ts src/app/layout.tsx && git commit -m "feat: initialize backup scheduler on startup"
```

---

## Task 7: Create Restore Runbook

**Files:**
- Create: `docs/runbooks/restore-from-backup.md`

**Step 1: Create runbook**

Create directory and file `docs/runbooks/restore-from-backup.md`:

```markdown
# SQLite Restore from Backup Runbook

## Overview

This runbook describes how to restore the SQLite database from an S3 backup.

## Prerequisites

- AWS CLI configured with credentials
- Access to the Fly.io app
- SSH access to the Fly machine

## Steps

### 1. List Available Backups

```bash
aws s3 ls s3://YOUR_BUCKET/sqlite-backups/ --human-readable
```

Or using Fly:

```bash
fly ssh console -a your-app-name
ls -la /data/backups/
```

### 2. Download Desired Backup

```bash
# Download from S3
aws s3 cp s3://YOUR_BUCKET/sqlite-backups/app-20260219-1200.db.gz ./backup.db.gz

# Or download from Fly machine
fly sftp get /data/backups/app-20260219-1200.db.gz ./backup.db.gz
```

### 3. Decompress Backup

```bash
gunzip backup.db.gz
# Result: backup.db
```

### 4. Verify Backup Integrity

```bash
sqlite3 backup.db "PRAGMA integrity_check;"
# Should output: ok

sqlite3 backup.db "SELECT COUNT(*) FROM Weapon;"
# Should show weapon count
```

### 5. Stop the Application

```bash
fly scale count 0 -a your-app-name
# Wait for app to stop
```

### 6. Replace Database

```bash
# SSH into machine
fly ssh console -a your-app-name

# Backup current database (just in case)
cp /data/app.db /data/app.db.pre-restore

# Replace with backup
# (Upload backup.db to machine first using fly sftp)
cp /path/to/backup.db /data/app.db
```

### 7. Restart Application

```bash
fly scale count 1 -a your-app-name
```

### 8. Verify Restoration

```bash
# Check health endpoint
curl https://your-app.fly.dev/api/health

# Check weapon count matches backup
fly ssh console -a your-app-name
sqlite3 /data/app.db "SELECT COUNT(*) FROM Weapon;"
```

## Rollback

If the restored database has issues:

```bash
fly ssh console -a your-app-name
cp /data/app.db.pre-restore /data/app.db
```

Then restart the app.

## Notes

- Backups are taken every 6 hours
- Retention: 14 daily backups, 8 weekly backups
- Backup filenames include timestamp: `app-YYYYMMDD-HHMM.db.gz`
```

**Step 2: Commit**

Run:
```bash
mkdir -p docs/runbooks && git add docs/runbooks/restore-from-backup.md && git commit -m "docs: add database restore runbook"
```

---

## Task 8: Final Verification

**Files:** None (verification only)

**Step 1: Run full build**

Run:
```bash
npm run build
```

Expected: Build succeeds.

**Step 2: Run tests**

Run:
```bash
npm run test:run
```

Expected: All tests pass.

**Step 3: Final commit**

Run:
```bash
git add -A && git commit -m "chore: complete backup system component" --allow-empty
```

---

## Component 11 Complete

**Summary of what was created:**
- SQLite .backup command wrapper
- Gzip compression for backups
- S3 upload for backup files
- Retention policy (14 daily, 8 weekly)
- Backup scheduler (every 6 hours)
- Automatic cleanup of old backups
- Service initialization on app start
- Database restore runbook

**Backup Schedule:**
- Frequency: Every 6 hours
- Location: S3 at `sqlite-backups/app-YYYYMMDD-HHMM.db.gz`
- Retention: 14 daily + 8 weekly backups

**Next:** Proceed to Component 11 - Observability
