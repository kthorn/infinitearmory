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
