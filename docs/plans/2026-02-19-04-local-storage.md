# Component 4: Local Image Storage Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement local filesystem storage for generated weapon images. Provides the same `uploadImage`/`deleteImage` interface that downstream components (6, 7) depend on, without requiring S3 configuration. S3 support is deferred to Component 13.

**Architecture:**

- **Storage:** Images stored on disk under a configurable directory (defaulting to `./public/uploads` in dev, `/data/uploads` in production on Fly).
- **Serving (dev):** Next.js automatically serves files from `public/` — images at `public/uploads/weapons/...` are accessible at `/uploads/weapons/...`.
- **Serving (prod):** A Next.js API route handler (`/api/uploads/[...path]`) reads and serves files from the production `STORAGE_DIR` (`/data/uploads`), since production files live outside `public/`.
- **Interface:** The storage module exports a unified interface (`StorageUploadParams`, `StorageResult`) so Component 13 can later add S3 as a backend without changing callers.

> **Note:** `STORAGE_DIR` must point to a directory that is served at `/uploads/` (dev default) or handled by the uploads API route (production). Arbitrary paths will cause URL mismatches.

**Tech Stack:** Node.js `fs/promises`, `path`, `crypto`

**Prerequisites:** Components 1-3 must be complete (provides `src/lib/env.ts` with `server-only` guard, Zod, vitest config with `test:run` script, and Prisma setup).

---

## Task 1: Update Environment Schema for Storage

**Files:**
- Modify: `src/lib/env.ts`
- Modify: `.env.example`

**Step 1: Add storage-related env vars**

Add the following fields to the `envSchema` in `src/lib/env.ts`:

```typescript
  // Storage
  STORAGE_DIR: z.string().min(1).optional(), // Override image storage directory (default: ./public/uploads)
```

**Step 2: Update .env.example**

Add to `.env.example`:

```bash

# Storage (local filesystem)
# STORAGE_DIR=./public/uploads  # Override image storage path (default: ./public/uploads, production: /data/uploads)
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
git add src/lib/env.ts .env.example && git commit -m "feat: add storage directory env var"
```

---

## Task 2: Create Local Storage Module

**Files:**
- Create: `src/lib/storage/local-storage.ts`

**Step 1: Create local filesystem storage**

Create file `src/lib/storage/local-storage.ts`:

```typescript
import 'server-only'
import { mkdir, writeFile, unlink } from 'fs/promises'
import { join, resolve } from 'path'
import { env } from '@/lib/env'

/**
 * Get the storage root directory.
 * - Uses STORAGE_DIR env var if set
 * - In production defaults to /data/uploads (Fly persistent volume)
 * - Otherwise defaults to ./public/uploads (served by Next.js in dev)
 */
function getStorageDir(): string {
  if (env.STORAGE_DIR) return env.STORAGE_DIR
  if (env.NODE_ENV === 'production') return '/data/uploads'
  return './public/uploads'
}

/**
 * Validate that a path stays within the storage root (prevents path traversal)
 */
function assertSafePath(filepath: string): void {
  const root = resolve(getStorageDir())
  const resolved = resolve(filepath)
  if (!resolved.startsWith(root + '/') && resolved !== root) {
    throw new Error(`Path traversal detected: ${filepath}`)
  }
}

/**
 * Validate that an ID is safe for use in filesystem paths
 */
function validateStorageId(id: string): void {
  if (!/^[\w-]+$/.test(id)) {
    throw new Error(`Invalid storage ID: ${id}`)
  }
}

/**
 * Determine file extension from MIME type
 */
function extensionForMime(mimeType?: string): string {
  switch (mimeType) {
    case 'image/webp':
      return 'webp'
    case 'image/jpeg':
      return 'jpg'
    case 'image/gif':
      return 'gif'
    default:
      return 'png'
  }
}

export interface LocalUploadParams {
  weaponId: string
  imageData: Buffer
  assetId?: string
  mimeType?: string
}

export interface LocalUploadResult {
  key: string
  url: string
}

/**
 * Save image to local filesystem
 */
export async function uploadToLocal({
  weaponId,
  imageData,
  assetId,
  mimeType,
}: LocalUploadParams): Promise<LocalUploadResult> {
  validateStorageId(weaponId)
  if (assetId) validateStorageId(assetId)

  const storageDir = getStorageDir()
  const dir = join(storageDir, 'weapons', weaponId)
  assertSafePath(dir)

  await mkdir(dir, { recursive: true })

  const finalAssetId = assetId ?? crypto.randomUUID()
  const ext = extensionForMime(mimeType)
  const filename = `${finalAssetId}.${ext}`
  const filepath = join(dir, filename)
  assertSafePath(filepath)

  await writeFile(filepath, imageData)

  const key = `weapons/${weaponId}/${filename}`

  // URL is always /uploads/... — in dev Next.js serves from public/uploads,
  // in prod a Next.js rewrite routes /uploads/* to the API route handler.
  const url = `/uploads/${key}`

  return { key, url }
}

/**
 * Delete image from local filesystem
 */
export async function deleteFromLocal(key: string): Promise<void> {
  if (!/^weapons\/[\w-]+\/[\w.-]+\.\w+$/.test(key)) {
    throw new Error(`Invalid local storage key for deletion: ${key}`)
  }

  const storageDir = getStorageDir()
  const filepath = join(storageDir, key)
  assertSafePath(filepath)

  try {
    await unlink(filepath)
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err
  }
}
```

**Step 2: Add uploads to gitignore**

Append to `.gitignore`:

```
# Local uploads (development)
public/uploads/
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
git add src/lib/storage/local-storage.ts .gitignore && git commit -m "feat: add local filesystem image storage"
```

---

## Task 3: Create Production Uploads Route Handler

**Files:**
- Create: `src/app/api/uploads/[...path]/route.ts`

**Step 1: Create route handler to serve uploaded images in production**

In dev, Next.js serves `public/uploads/` automatically. In production, files live at `/data/uploads/` (outside `public/`), so we need an API route to serve them.

Create file `src/app/api/uploads/[...path]/route.ts`:

```typescript
import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { readFile, stat } from 'fs/promises'
import { join, resolve, extname } from 'path'
import { env } from '@/lib/env'

export const runtime = 'nodejs'

function getStorageDir(): string {
  if (env.STORAGE_DIR) return env.STORAGE_DIR
  if (env.NODE_ENV === 'production') return '/data/uploads'
  return './public/uploads'
}

const MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params
  const relativePath = segments.join('/')

  // Validate path: only allow weapon image paths with known extensions
  if (!/^weapons\/[\w-]+\/[\w.-]+\.(png|jpg|jpeg|webp|gif)$/.test(relativePath)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const storageDir = resolve(getStorageDir())
  const filepath = resolve(join(storageDir, relativePath))

  // Path traversal check
  if (!filepath.startsWith(storageDir + '/')) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    await stat(filepath)
    const data = await readFile(filepath)
    const ext = extname(filepath).toLowerCase()
    const contentType = MIME_TYPES[ext]
    if (!contentType) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return new NextResponse(data, {
      headers: {
        'Content-Type': contentType,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'public, max-age=86400, immutable',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}
```

> **Note:** In dev this route coexists with Next.js static serving from `public/`. In production it is the only way to serve uploaded images. The URL pattern `/uploads/weapons/...` maps to this route via `/api/uploads/weapons/...` — however, since the storage module generates URLs as `/uploads/...`, we need a Next.js rewrite to map `/uploads/:path*` to `/api/uploads/:path*`.

**Step 2: Add Next.js rewrite for `/uploads/*`**

Update `next.config.ts` to add a rewrite:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: '/api/uploads/:path*',
      },
    ]
  },
};

export default nextConfig;
```

> In dev, Next.js static file serving from `public/` takes priority over rewrites, so `public/uploads/` files are served directly. In production (where files are at `/data/uploads/` not `public/`), the rewrite kicks in and the API route serves them.

**Step 3: Verify compilation**

Run:
```bash
npx tsc --noEmit
```

Expected: No errors.

**Step 4: Commit**

Run:
```bash
git add src/app/api/uploads next.config.ts && git commit -m "feat: add production uploads route handler with rewrite"
```

---

## Task 4: Create Unified Storage Interface

**Files:**
- Create: `src/lib/storage/index.ts`

**Step 1: Create storage facade**

Create file `src/lib/storage/index.ts`:

```typescript
import { uploadToLocal, deleteFromLocal } from './local-storage'

export interface StorageUploadParams {
  weaponId: string
  imageData: Buffer
  assetId?: string
  mimeType?: string
}

export interface StorageResult {
  key: string
  url: string
}

/**
 * Upload image to storage
 *
 * Currently uses local filesystem. When Component 13 (S3) is implemented,
 * this will auto-select S3 or local based on env configuration.
 */
export async function uploadImage(params: StorageUploadParams): Promise<StorageResult> {
  return uploadToLocal(params)
}

/**
 * Delete image from storage
 */
export async function deleteImage(urlOrKey: string): Promise<void> {
  const key = urlOrKey.startsWith('/uploads/') ? urlOrKey.replace('/uploads/', '') : urlOrKey
  await deleteFromLocal(key)
}
```

**Step 2: Remove .gitkeep**

Run:
```bash
rm -f src/lib/storage/.gitkeep
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
git add -A src/lib/storage && git commit -m "feat: add unified storage interface (local backend)"
```

---

## Task 5: Write Storage Unit Tests

**Files:**
- Create: `src/lib/storage/__tests__/local-storage.test.ts`

**Step 1: Create local storage tests**

Create file `src/lib/storage/__tests__/local-storage.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { existsSync, readFileSync } from 'fs'
import { mkdtemp, rm } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'

// Each test resets modules so that env.STORAGE_DIR is re-evaluated.
// We mock @/lib/env to read from process.env at import time.
describe('local-storage', () => {
  let testDir: string

  beforeEach(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'weapon-gen-test-'))
    process.env.STORAGE_DIR = testDir
    // Reset module registry so local-storage re-imports env with new STORAGE_DIR
    vi.resetModules()
  })

  afterEach(async () => {
    await rm(testDir, { recursive: true, force: true })
    delete process.env.STORAGE_DIR
    vi.resetModules()
  })

  async function importLocalStorage() {
    // Dynamic import after vi.resetModules() ensures fresh env evaluation
    const mod = await import('../local-storage')
    return mod
  }

  describe('uploadToLocal', () => {
    it('uploads image to local filesystem', async () => {
      const { uploadToLocal } = await importLocalStorage()

      const imageData = Buffer.from('fake-png-data')
      const weaponId = 'test-weapon-123'

      const result = await uploadToLocal({
        weaponId,
        imageData,
        assetId: 'test-asset',
      })

      expect(result.key).toBe('weapons/test-weapon-123/test-asset.png')
      expect(result.url).toBe('/uploads/weapons/test-weapon-123/test-asset.png')

      const filepath = join(testDir, result.key)
      expect(existsSync(filepath)).toBe(true)
      expect(readFileSync(filepath).toString()).toBe('fake-png-data')
    })

    it('generates asset ID if not provided', async () => {
      const { uploadToLocal } = await importLocalStorage()

      const result = await uploadToLocal({
        weaponId: 'test-weapon-456',
        imageData: Buffer.from('fake'),
      })

      expect(result.key).toMatch(/^weapons\/test-weapon-456\/[\w-]+\.png$/)
    })

    it('uses correct extension for mimeType', async () => {
      const { uploadToLocal } = await importLocalStorage()

      const result = await uploadToLocal({
        weaponId: 'test-weapon-789',
        imageData: Buffer.from('fake'),
        assetId: 'webp-test',
        mimeType: 'image/webp',
      })

      expect(result.key).toBe('weapons/test-weapon-789/webp-test.webp')
    })

    it('rejects weaponId with path traversal characters', async () => {
      const { uploadToLocal } = await importLocalStorage()

      await expect(uploadToLocal({
        weaponId: '../../../etc',
        imageData: Buffer.from('fake'),
      })).rejects.toThrow('Invalid storage ID')
    })

    it('rejects assetId with path traversal characters', async () => {
      const { uploadToLocal } = await importLocalStorage()

      await expect(uploadToLocal({
        weaponId: 'safe-id',
        imageData: Buffer.from('fake'),
        assetId: '../../etc/passwd',
      })).rejects.toThrow('Invalid storage ID')
    })
  })

  describe('deleteFromLocal', () => {
    it('deletes existing file', async () => {
      const { uploadToLocal, deleteFromLocal } = await importLocalStorage()

      const result = await uploadToLocal({
        weaponId: 'del-test',
        imageData: Buffer.from('to-delete'),
        assetId: 'deleteme',
      })

      const filepath = join(testDir, result.key)
      expect(existsSync(filepath)).toBe(true)

      await deleteFromLocal(result.key)
      expect(existsSync(filepath)).toBe(false)
    })

    it('handles non-existent file gracefully', async () => {
      const { deleteFromLocal } = await importLocalStorage()
      await expect(deleteFromLocal('weapons/fake/nonexistent.png')).resolves.toBeUndefined()
    })

    it('rejects invalid key patterns', async () => {
      const { deleteFromLocal } = await importLocalStorage()
      await expect(deleteFromLocal('../../etc/passwd')).rejects.toThrow('Invalid local storage key')
    })
  })
})
```

**Step 2: Run tests**

Run:
```bash
npm run test:run
```

Expected: All tests pass (both schema tests and storage tests).

**Step 3: Commit**

Run:
```bash
git add src/lib/storage/__tests__ && git commit -m "feat: add local storage unit tests"
```

---

## Task 6: Final Verification

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

---

## Component 4 Complete

**Summary of what was created:**
- Local filesystem image storage with path traversal protection
- MIME type-aware file extensions (png, webp, jpg, gif)
- Configurable storage directory via `STORAGE_DIR` env var
- Production uploads route handler (`/api/uploads/[...path]`) with Next.js rewrite
- Unified storage interface (`uploadImage`, `deleteImage`) matching the contract expected by Component 6
- `StorageUploadParams` includes optional `mimeType` field (cross-component note from Component 6)
- Unit tests for upload, delete, and security validations (with proper module reset per test)
- Dev: images served from `public/uploads/` by Next.js static file serving
- Prod: images served via API route handler from `/data/uploads/` on Fly persistent volume

**Interface (used by Components 6 and 7):**
```typescript
import { uploadImage, deleteImage } from '@/lib/storage'

const { url, key } = await uploadImage({
  weaponId: 'abc123',
  imageData: imageBuffer,
  mimeType: 'image/png',
})

await deleteImage(url) // or deleteImage(key)
```

**Migration path to S3 (Component 13):**
When ready, implement Component 13 and update `src/lib/storage/index.ts` to check `isS3Configured()` and route to S3 or local accordingly. No changes needed in Components 5, 6, 7, or 8.

**Next:** Proceed to Component 5 - AI Providers
