import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/weapons/[id]/route'

vi.mock('@/lib/db', () => ({
  db: {
    weapon: {
      findUnique: vi.fn(),
    },
  },
}))

const { db } = await import('@/lib/db')

function makeRequest(url: string) {
  return new NextRequest(new URL(url, 'http://localhost'))
}

describe('GET /api/weapons/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns weapon by id', async () => {
    const mockWeapon = {
      id: 'test-id',
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'done',
      userPrompt: 'A fire sword',
      options: '{}',
      weaponSpec: null,
      descriptionMd: null,
      imageUrl: null,
      errorMessage: null,
      imagePrompt: null,
      imageModel: null,
      textModel: null,
      promptVersion: 'v1',
      activeVersionId: null,
    }
    vi.mocked(db.weapon.findUnique).mockResolvedValue(mockWeapon)

    const req = makeRequest('http://localhost/api/weapons/test-id')
    const res = await GET(req, { params: Promise.resolve({ id: 'test-id' }) })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.id).toBe('test-id')
  })

  it('returns 404 for non-existent weapon', async () => {
    vi.mocked(db.weapon.findUnique).mockResolvedValue(null)

    const req = makeRequest('http://localhost/api/weapons/missing')
    const res = await GET(req, { params: Promise.resolve({ id: 'missing' }) })

    expect(res.status).toBe(404)
  })
})
