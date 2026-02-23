import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST, GET } from '../route'

// Mock dependencies
vi.mock('@/lib/db', () => ({
  db: {
    weapon: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}))

vi.mock('@/lib/generation', () => ({
  runGenerationInBackground: vi.fn(),
}))

const { db } = await import('@/lib/db')

function makeRequest(url: string, options?: RequestInit) {
  return new NextRequest(new URL(url, 'http://localhost'), options as never)
}

describe('POST /api/weapons', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a weapon and returns 201', async () => {
    const mockWeapon = {
      id: 'test-id',
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'queued',
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
    vi.mocked(db.weapon.create).mockResolvedValue(mockWeapon)

    const req = makeRequest('http://localhost/api/weapons', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'A fire sword' }),
    })
    const res = await POST(req)

    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.id).toBe('test-id')
    expect(body.status).toBe('queued')
  })

  it('returns 400 for invalid JSON', async () => {
    const req = makeRequest('http://localhost/api/weapons', {
      method: 'POST',
      body: 'not json',
      headers: { 'Content-Type': 'application/json' },
    })
    const res = await POST(req)

    expect(res.status).toBe(400)
  })

  it('returns 400 for validation errors', async () => {
    const req = makeRequest('http://localhost/api/weapons', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'ab' }), // too short
    })
    const res = await POST(req)

    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('Validation failed')
  })
})

describe('GET /api/weapons', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns paginated weapons with defaults', async () => {
    vi.mocked(db.weapon.findMany).mockResolvedValue([])
    vi.mocked(db.weapon.count).mockResolvedValue(0)

    const req = makeRequest('http://localhost/api/weapons')
    const res = await GET(req)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.weapons).toEqual([])
    expect(body.page).toBe(1)
    expect(body.limit).toBe(20)
    expect(body.hasMore).toBe(false)
  })

  it('respects page and limit params', async () => {
    vi.mocked(db.weapon.findMany).mockResolvedValue([])
    vi.mocked(db.weapon.count).mockResolvedValue(100)

    const req = makeRequest('http://localhost/api/weapons?page=2&limit=10')
    const res = await GET(req)

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.page).toBe(2)
    expect(body.limit).toBe(10)
    expect(body.hasMore).toBe(true)
  })

  it('returns 400 for invalid pagination params', async () => {
    const req = makeRequest('http://localhost/api/weapons?page=-1')
    const res = await GET(req)

    expect(res.status).toBe(400)
  })
})
