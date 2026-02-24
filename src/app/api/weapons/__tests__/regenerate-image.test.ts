import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/weapons/[id]/regenerate-image/route'

vi.mock('@/lib/db', () => ({
  db: {
    weapon: {
      findUnique: vi.fn(),
    },
  },
}))

vi.mock('@/lib/generation', () => ({
  regenerateImage: vi.fn(),
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
  activeVersionId: null,
}

function makeRequest(url: string, options?: RequestInit) {
  return new NextRequest(new URL(url, 'http://localhost'), options as never)
}

describe('POST /api/weapons/:id/regenerate-image', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 404 for non-existent weapon', async () => {
    vi.mocked(db.weapon.findUnique).mockResolvedValue(null)

    const req = makeRequest('http://localhost/api/weapons/missing/regenerate-image', { method: 'POST' })
    const res = await POST(req, { params: Promise.resolve({ id: 'missing' }) })

    expect(res.status).toBe(404)
  })

  it('returns 400 for weapon without spec', async () => {
    vi.mocked(db.weapon.findUnique).mockResolvedValue({ ...baseMockWeapon, weaponSpec: null })

    const req = makeRequest('http://localhost/api/weapons/test-id/regenerate-image', { method: 'POST' })
    const res = await POST(req, { params: Promise.resolve({ id: 'test-id' }) })

    expect(res.status).toBe(400)
  })

  it('returns 409 for weapon currently generating', async () => {
    vi.mocked(db.weapon.findUnique).mockResolvedValue({ ...baseMockWeapon, status: 'generating_image' })

    const req = makeRequest('http://localhost/api/weapons/test-id/regenerate-image', { method: 'POST' })
    const res = await POST(req, { params: Promise.resolve({ id: 'test-id' }) })

    expect(res.status).toBe(409)
  })

  it('returns 400 for invalid style value', async () => {
    vi.mocked(db.weapon.findUnique).mockResolvedValue(baseMockWeapon)

    const req = makeRequest('http://localhost/api/weapons/test-id/regenerate-image', {
      method: 'POST',
      body: JSON.stringify({ style: 'not_a_valid_style' }),
      headers: { 'Content-Length': '35' },
    })
    const res = await POST(req, { params: Promise.resolve({ id: 'test-id' }) })

    expect(res.status).toBe(400)
  })

  it('accepts optional guidance in request body', async () => {
    const { regenerateImage } = await import('@/lib/generation')
    vi.mocked(db.weapon.findUnique)
      .mockResolvedValueOnce(baseMockWeapon)
      .mockResolvedValueOnce({ ...baseMockWeapon, _count: { versions: 2 } } as never)

    const req = makeRequest('http://localhost/api/weapons/test-id/regenerate-image', {
      method: 'POST',
      body: JSON.stringify({ guidance: 'Make it darker' }),
      headers: { 'Content-Type': 'application/json', 'Content-Length': '28' },
    })
    const res = await POST(req, { params: Promise.resolve({ id: 'test-id' }) })

    expect(res.status).toBe(200)
    expect(vi.mocked(regenerateImage)).toHaveBeenCalledWith('test-id', undefined, 'Make it darker')
  })
})
