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
