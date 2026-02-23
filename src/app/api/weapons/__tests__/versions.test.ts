import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/db', () => ({
  db: {
    weapon: { findUnique: vi.fn() },
    weaponVersion: { findMany: vi.fn() },
  },
}))

const { db } = await import('@/lib/db')

describe('GET /api/weapons/:id/versions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 404 if weapon not found', async () => {
    vi.mocked(db.weapon.findUnique).mockResolvedValue(null)
    const { GET } = await import('@/app/api/weapons/[id]/versions/route')
    const request = new NextRequest('http://localhost/api/weapons/missing/versions')
    const response = await GET(request, { params: Promise.resolve({ id: 'missing' }) })
    expect(response.status).toBe(404)
  })

  it('returns versions for a weapon', async () => {
    vi.mocked(db.weapon.findUnique).mockResolvedValue({ id: 'w1' } as never)
    vi.mocked(db.weaponVersion.findMany).mockResolvedValue([
      {
        id: 'v1',
        createdAt: new Date('2026-01-01'),
        weaponId: 'w1',
        versionNumber: 1,
        descriptionMd: 'desc',
        weaponSpec: '{"category":"fantasy_weapon","name":"Sword"}',
        imageUrl: '/uploads/weapons/w1/img.png',
        imagePrompt: 'a sword',
        textModel: 'claude-sonnet-4-6',
        imageModel: 'gpt-image-1',
      },
    ] as never)

    const { GET } = await import('@/app/api/weapons/[id]/versions/route')
    const request = new NextRequest('http://localhost/api/weapons/w1/versions')
    const response = await GET(request, { params: Promise.resolve({ id: 'w1' }) })
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.versions).toHaveLength(1)
    expect(data.versions[0].versionNumber).toBe(1)
  })
})
