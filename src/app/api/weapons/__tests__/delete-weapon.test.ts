import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { DELETE } from '@/app/api/weapons/[id]/route'

vi.mock('@/lib/db', () => ({
  db: {
    weapon: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

vi.mock('@/lib/storage', () => ({
  deleteImage: vi.fn(),
}))

const { db } = await import('@/lib/db')
const { deleteImage } = await import('@/lib/storage')

function makeRequest(url: string) {
  return new NextRequest(new URL(url, 'http://localhost'))
}

describe('DELETE /api/weapons/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deletes weapon and its image', async () => {
    vi.mocked(db.weapon.findUnique).mockResolvedValue({
      id: 'test-id',
      imageUrl: '/uploads/weapons/test-id/img.png',
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'done',
      userPrompt: 'A sword',
      options: '{}',
      weaponSpec: null,
      descriptionMd: null,
      errorMessage: null,
      imagePrompt: null,
      imageModel: null,
      textModel: null,
      promptVersion: 'v1',
    })
    vi.mocked(db.weapon.delete).mockResolvedValue({} as any)

    const req = makeRequest('http://localhost/api/weapons/test-id')
    const res = await DELETE(req, { params: Promise.resolve({ id: 'test-id' }) })

    expect(res.status).toBe(200)
    expect(deleteImage).toHaveBeenCalledWith('/uploads/weapons/test-id/img.png')
    expect(db.weapon.delete).toHaveBeenCalledWith({ where: { id: 'test-id' } })
  })

  it('deletes weapon without image', async () => {
    vi.mocked(db.weapon.findUnique).mockResolvedValue({
      id: 'test-id',
      imageUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'done',
      userPrompt: 'A sword',
      options: '{}',
      weaponSpec: null,
      descriptionMd: null,
      errorMessage: null,
      imagePrompt: null,
      imageModel: null,
      textModel: null,
      promptVersion: 'v1',
    })
    vi.mocked(db.weapon.delete).mockResolvedValue({} as any)

    const req = makeRequest('http://localhost/api/weapons/test-id')
    const res = await DELETE(req, { params: Promise.resolve({ id: 'test-id' }) })

    expect(res.status).toBe(200)
    expect(deleteImage).not.toHaveBeenCalled()
    expect(db.weapon.delete).toHaveBeenCalledWith({ where: { id: 'test-id' } })
  })

  it('returns 404 for non-existent weapon', async () => {
    vi.mocked(db.weapon.findUnique).mockResolvedValue(null)

    const req = makeRequest('http://localhost/api/weapons/missing')
    const res = await DELETE(req, { params: Promise.resolve({ id: 'missing' }) })

    expect(res.status).toBe(404)
  })
})
