import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { middleware } from '../middleware'

function makeRequest(method: string, path: string, authPassword?: string): NextRequest {
  const url = `http://localhost:3000${path}`
  const headers = new Headers()
  if (authPassword) {
    const credentials = Buffer.from(`user:${authPassword}`).toString('base64')
    headers.set('Authorization', `Basic ${credentials}`)
  }
  return new NextRequest(new Request(url, { method, headers }))
}

describe('middleware', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv, AUTH_PASSWORD: 'test-password' }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('public routes (no auth required)', () => {
    it('allows GET /weapons without auth', () => {
      const response = middleware(makeRequest('GET', '/weapons'))
      expect(response.status).not.toBe(401)
    })

    it('allows GET /weapons/:id without auth', () => {
      const response = middleware(makeRequest('GET', '/weapons/abc-123'))
      expect(response.status).not.toBe(401)
    })

    it('allows GET /api/weapons without auth', () => {
      const response = middleware(makeRequest('GET', '/api/weapons'))
      expect(response.status).not.toBe(401)
    })

    it('allows GET /api/weapons/:id without auth', () => {
      const response = middleware(makeRequest('GET', '/api/weapons/abc-123'))
      expect(response.status).not.toBe(401)
    })

    it('allows GET /api/health without auth', () => {
      const response = middleware(makeRequest('GET', '/api/health'))
      expect(response.status).not.toBe(401)
    })
  })

  describe('auth-required routes', () => {
    it('returns 401 for / without auth', () => {
      const response = middleware(makeRequest('GET', '/'))
      expect(response.status).toBe(401)
    })

    it('returns 401 for POST /api/weapons without auth', () => {
      const response = middleware(makeRequest('POST', '/api/weapons'))
      expect(response.status).toBe(401)
    })

    it('returns 401 for DELETE /api/weapons/:id without auth', () => {
      const response = middleware(makeRequest('DELETE', '/api/weapons/abc-123'))
      expect(response.status).toBe(401)
    })

    it('returns 401 for POST /api/transcribe without auth', () => {
      const response = middleware(makeRequest('POST', '/api/transcribe'))
      expect(response.status).toBe(401)
    })

    it('allows / with correct auth', () => {
      const response = middleware(makeRequest('GET', '/', 'test-password'))
      expect(response.status).not.toBe(401)
    })

    it('allows POST /api/weapons with correct auth', () => {
      const response = middleware(makeRequest('POST', '/api/weapons', 'test-password'))
      expect(response.status).not.toBe(401)
    })
  })
})
