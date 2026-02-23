import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/db', () => ({
  db: {
    weapon: { findUnique: vi.fn(), update: vi.fn() },
    weaponVersion: { findUnique: vi.fn() },
  },
}))

const { db } = await import('@/lib/db')

describe('POST /api/weapons/:id/versions/:versionId/promote', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 404 if version not found', async () => {
    vi.mocked(db.weapon.findUnique).mockResolvedValue({ id: 'w1' } as never)
    vi.mocked(db.weaponVersion.findUnique).mockResolvedValue(null)

    const { POST } = await import('@/app/api/weapons/[id]/versions/[versionId]/promote/route')
    const request = new NextRequest('http://localhost/api/weapons/w1/versions/missing/promote', { method: 'POST' })
    const response = await POST(request, { params: Promise.resolve({ id: 'w1', versionId: 'missing' }) })
    expect(response.status).toBe(404)
  })

  it('promotes version and syncs data to weapon', async () => {
    vi.mocked(db.weapon.findUnique).mockResolvedValue({ id: 'w1' } as never)
    vi.mocked(db.weaponVersion.findUnique).mockResolvedValue({
      id: 'v2',
      weaponId: 'w1',
      versionNumber: 2,
      descriptionMd: 'new desc',
      weaponSpec: '{"category":"fantasy_weapon","name":"Better Sword"}',
      imageUrl: '/img2.png',
      imagePrompt: 'better sword',
      textModel: 'gpt-5',
      imageModel: 'gpt-image-1',
      createdAt: new Date(),
    } as never)
    vi.mocked(db.weapon.update).mockResolvedValue({
      id: 'w1',
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'done',
      userPrompt: 'A sword',
      options: '{}',
      activeVersionId: 'v2',
      weaponSpec: '{"category":"fantasy_weapon","name":"Better Sword"}',
      descriptionMd: 'new desc',
      imageUrl: '/img2.png',
      imagePrompt: 'better sword',
      textModel: 'gpt-5',
      imageModel: 'gpt-image-1',
      errorMessage: null,
      promptVersion: 'v1',
      _count: { versions: 2 },
    } as never)

    const { POST } = await import('@/app/api/weapons/[id]/versions/[versionId]/promote/route')
    const request = new NextRequest('http://localhost/api/weapons/w1/versions/v2/promote', { method: 'POST' })
    const response = await POST(request, { params: Promise.resolve({ id: 'w1', versionId: 'v2' }) })
    expect(response.status).toBe(200)

    expect(db.weapon.update).toHaveBeenCalledWith({
      where: { id: 'w1' },
      data: expect.objectContaining({
        activeVersionId: 'v2',
        weaponSpec: '{"category":"fantasy_weapon","name":"Better Sword"}',
        descriptionMd: 'new desc',
        imageUrl: '/img2.png',
        imagePrompt: 'better sword',
        textModel: 'gpt-5',
        imageModel: 'gpt-image-1',
      }),
      include: { _count: { select: { versions: true } } },
    })
  })
})
