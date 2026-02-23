import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock server-only before any imports that use it
vi.mock('server-only', () => ({}))

// Mock env
vi.mock('@/lib/env', () => ({
  env: { OPENAI_API_KEY: 'test-key' },
}))

// Mock OpenAI
const mockCreate = vi.fn()
const mockToFile = vi.fn((blob: Blob, name: string) => ({ blob, name }))
vi.mock('openai', () => ({
  default: class {
    audio = { transcriptions: { create: mockCreate } }
  },
  toFile: (...args: any[]) => mockToFile(...args),
}))

import { NextRequest } from 'next/server'
import { POST } from '../route'

function makeRequest(body?: FormData): NextRequest {
  if (!body) {
    return new NextRequest(new URL('http://localhost/api/transcribe'), {
      method: 'POST',
    })
  }
  return new NextRequest(new URL('http://localhost/api/transcribe'), {
    method: 'POST',
    body,
  })
}

describe('POST /api/transcribe', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 500 when OPENAI_API_KEY is not set', async () => {
    const { env } = await import('@/lib/env')
    const original = env.OPENAI_API_KEY
    env.OPENAI_API_KEY = ''

    try {
      const form = new FormData()
      const audioBlob = new Blob(['fake-audio'], { type: 'audio/webm' })
      form.append('audio', audioBlob, 'recording.webm')

      const res = await POST(makeRequest(form))
      expect(res.status).toBe(500)
    } finally {
      env.OPENAI_API_KEY = original
    }
  })

  it('returns 400 when no audio file is provided', async () => {
    const form = new FormData()
    const res = await POST(makeRequest(form))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/audio/i)
  })

  it('returns 400 when file is not audio', async () => {
    const form = new FormData()
    const textBlob = new Blob(['not audio'], { type: 'text/plain' })
    form.append('audio', textBlob, 'file.txt')

    const res = await POST(makeRequest(form))
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/audio/i)
  })

  it('returns 413 when file exceeds 25MB', async () => {
    const form = new FormData()
    const largeBlob = new Blob([new ArrayBuffer(26 * 1024 * 1024)], { type: 'audio/webm' })
    form.append('audio', largeBlob, 'recording.webm')

    const res = await POST(makeRequest(form))
    expect(res.status).toBe(413)
  })

  it('returns transcribed text on success', async () => {
    mockCreate.mockResolvedValue({ text: 'a flaming sword of destiny' })

    const form = new FormData()
    const audioBlob = new Blob(['fake-audio'], { type: 'audio/webm' })
    form.append('audio', audioBlob, 'recording.webm')

    const res = await POST(makeRequest(form))
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.text).toBe('a flaming sword of destiny')
  })

  it('calls OpenAI with whisper-1 model and toFile', async () => {
    mockCreate.mockResolvedValue({ text: 'test' })

    const form = new FormData()
    const audioBlob = new Blob(['fake-audio'], { type: 'audio/webm' })
    form.append('audio', audioBlob, 'recording.webm')

    await POST(makeRequest(form))

    expect(mockToFile).toHaveBeenCalled()
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'whisper-1' })
    )
  })

  it('returns 500 when Whisper API fails', async () => {
    mockCreate.mockRejectedValue(new Error('Whisper failed'))

    const form = new FormData()
    const audioBlob = new Blob(['fake-audio'], { type: 'audio/webm' })
    form.append('audio', audioBlob, 'recording.webm')

    const res = await POST(makeRequest(form))
    expect(res.status).toBe(500)
  })
})
