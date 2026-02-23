import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/db', () => ({
  db: {
    weapon: { findUnique: vi.fn() },
    weaponVersion: { findUnique: vi.fn(), delete: vi.fn() },
  },
}))

vi.mock('@/lib/storage', () => ({
  deleteImage: vi.fn(),
}))

const { db } = await import('@/lib/db')
const { deleteImage } = await import('@/lib/storage')

describe('DELETE /api/weapons/:id/versions/:versionId', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 404 if version not found', async () => {
    vi.mocked(db.weapon.findUnique).mockResolvedValue({ id: 'w1', activeVersionId: 'v1' } as never)
    vi.mocked(db.weaponVersion.findUnique).mockResolvedValue(null)

    const { DELETE } = await import('@/app/api/weapons/[id]/versions/[versionId]/route')
    const request = new NextRequest('http://localhost/api/weapons/w1/versions/missing', { method: 'DELETE' })
    const response = await DELETE(request, { params: Promise.resolve({ id: 'w1', versionId: 'missing' }) })
    expect(response.status).toBe(404)
  })

  it('rejects deleting the active version', async () => {
    vi.mocked(db.weapon.findUnique).mockResolvedValue({ id: 'w1', activeVersionId: 'v1' } as never)
    vi.mocked(db.weaponVersion.findUnique).mockResolvedValue({ id: 'v1', weaponId: 'w1' } as never)

    const { DELETE } = await import('@/app/api/weapons/[id]/versions/[versionId]/route')
    const request = new NextRequest('http://localhost/api/weapons/w1/versions/v1', { method: 'DELETE' })
    const response = await DELETE(request, { params: Promise.resolve({ id: 'w1', versionId: 'v1' }) })
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toMatch(/active/)
  })

  it('deletes version and cleans up image', async () => {
    vi.mocked(db.weapon.findUnique).mockResolvedValue({ id: 'w1', activeVersionId: 'v1' } as never)
    vi.mocked(db.weaponVersion.findUnique).mockResolvedValue({
      id: 'v2',
      weaponId: 'w1',
      imageUrl: '/uploads/weapons/w1/img.png',
    } as never)
    vi.mocked(db.weaponVersion.delete).mockResolvedValue({} as never)

    const { DELETE } = await import('@/app/api/weapons/[id]/versions/[versionId]/route')
    const request = new NextRequest('http://localhost/api/weapons/w1/versions/v2', { method: 'DELETE' })
    const response = await DELETE(request, { params: Promise.resolve({ id: 'w1', versionId: 'v2' }) })
    expect(response.status).toBe(200)
    expect(deleteImage).toHaveBeenCalledWith('/uploads/weapons/w1/img.png')
    expect(db.weaponVersion.delete).toHaveBeenCalledWith({ where: { id: 'v2' } })
  })
})
