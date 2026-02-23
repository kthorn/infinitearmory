import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { verifyBasicAuth } from '../basic-auth'

describe('verifyBasicAuth', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv, AUTH_PASSWORD: 'test-password' }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('returns authenticated when no password is configured', () => {
    delete process.env.AUTH_PASSWORD
    const result = verifyBasicAuth(null)
    expect(result.authenticated).toBe(true)
  })

  it('returns authenticated when password is empty string', () => {
    process.env.AUTH_PASSWORD = ''
    const result = verifyBasicAuth(null)
    expect(result.authenticated).toBe(true)
  })

  it('returns not authenticated when header is missing', () => {
    const result = verifyBasicAuth(null)
    expect(result.authenticated).toBe(false)
    expect(result.error).toBe('Missing Authorization header')
  })

  it('returns not authenticated for non-Basic auth', () => {
    const result = verifyBasicAuth('Bearer token123')
    expect(result.authenticated).toBe(false)
    expect(result.error).toBe('Invalid Authorization header format')
  })

  it('returns authenticated for correct password', () => {
    // "user:test-password" in base64
    const credentials = Buffer.from('user:test-password').toString('base64')
    const result = verifyBasicAuth(`Basic ${credentials}`)
    expect(result.authenticated).toBe(true)
  })

  it('returns not authenticated for wrong password', () => {
    const credentials = Buffer.from('user:wrong-password').toString('base64')
    const result = verifyBasicAuth(`Basic ${credentials}`)
    expect(result.authenticated).toBe(false)
    expect(result.error).toBe('Invalid credentials')
  })

  it('handles invalid base64', () => {
    const result = verifyBasicAuth('Basic not-valid-base64!!!')
    // Should not crash, returns error
    expect(result.authenticated).toBe(false)
  })
})
