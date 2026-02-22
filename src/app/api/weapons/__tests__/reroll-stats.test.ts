import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/weapons/[id]/reroll-stats/route'

vi.mock('@/lib/db', () => ({
  db: {
    weapon: {
      findUnique: vi.fn(),
    },
  },
}))

vi.mock('@/lib/generation', () => ({
  rerollWeapon: vi.fn(),
}))

const { db } = await import('@/lib/db')

const baseMockWeapon = {
  id: 'test-id',
  createdAt: new Date(),
  updatedAt: new Date(),
  status: 'done',
  userPrompt: 'A fire sword',
  options: '{}',
  weaponSpec: '{"name":"Fire Sword"}',
  descriptionMd: 'A sword of fire',
  imageUrl: null,
  errorMessage: null,
  imagePrompt: null,
  imageModel: null,
  textModel: null,
  promptVersion: 'v1',
}

function makeRequest(url: string, options?: RequestInit) {
  return new NextRequest(new URL(url, 'http://localhost'), options as never)
}

describe('POST /api/weapons/:id/reroll-stats', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 404 for non-existent weapon', async () => {
    vi.mocked(db.weapon.findUnique).mockResolvedValue(null)

    const req = makeRequest('http://localhost/api/weapons/missing/reroll-stats', { method: 'POST' })
    const res = await POST(req, { params: Promise.resolve({ id: 'missing' }) })

    expect(res.status).toBe(404)
  })

  it('returns 409 for weapon currently generating', async () => {
    vi.mocked(db.weapon.findUnique).mockResolvedValue({ ...baseMockWeapon, status: 'generating_text' })

    const req = makeRequest('http://localhost/api/weapons/test-id/reroll-stats', { method: 'POST' })
    const res = await POST(req, { params: Promise.resolve({ id: 'test-id' }) })

    expect(res.status).toBe(409)
  })
})
