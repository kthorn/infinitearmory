import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '../route'

vi.mock('@/lib/db', () => ({
  db: {
    $queryRaw: vi.fn(),
  },
}))

const { db } = await import('@/lib/db')

describe('GET /api/health', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns healthy when DB is available', async () => {
    vi.mocked(db.$queryRaw).mockResolvedValue([{ 1: 1 }])

    const res = await GET()

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('healthy')
  })

  it('returns unhealthy when DB is down', async () => {
    vi.mocked(db.$queryRaw).mockRejectedValue(new Error('DB down'))

    const res = await GET()

    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.status).toBe('unhealthy')
  })
})
