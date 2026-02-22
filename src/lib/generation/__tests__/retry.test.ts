import { describe, it, expect, vi } from 'vitest'
import { withRetry, isTransientError } from '../retry'

describe('withRetry', () => {
  it('returns result on first success', async () => {
    const fn = vi.fn().mockResolvedValue('success')

    const result = await withRetry(fn)

    expect(result).toBe('success')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('retries on failure and succeeds', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockResolvedValue('success')

    const result = await withRetry(fn, { maxAttempts: 3, delayMs: 10 })

    expect(result).toBe('success')
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('throws after max attempts', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('always fails'))

    await expect(withRetry(fn, { maxAttempts: 2, delayMs: 10 })).rejects.toThrow('always fails')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('respects shouldRetry predicate', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('non-retryable'))

    await expect(
      withRetry(fn, {
        maxAttempts: 3,
        delayMs: 10,
        shouldRetry: () => false,
      })
    ).rejects.toThrow('non-retryable')

    expect(fn).toHaveBeenCalledTimes(1) // Only tried once
  })
})

describe('isTransientError', () => {
  it('returns true for rate limit errors', () => {
    expect(isTransientError(new Error('rate limit exceeded'))).toBe(true)
    expect(isTransientError(new Error('Error 429: Too many requests'))).toBe(true)
  })

  it('returns true for timeout errors', () => {
    expect(isTransientError(new Error('Request timeout'))).toBe(true)
    expect(isTransientError(new Error('Connection timed out'))).toBe(true)
  })

  it('returns true for network errors', () => {
    expect(isTransientError(new Error('Network error'))).toBe(true)
    expect(isTransientError(new Error('Connection refused'))).toBe(true)
  })

  it('returns true for 5xx errors', () => {
    expect(isTransientError(new Error('500 Internal Server Error'))).toBe(true)
    expect(isTransientError(new Error('502 Bad Gateway'))).toBe(true)
    expect(isTransientError(new Error('503 Service Unavailable'))).toBe(true)
  })

  it('returns false for non-transient errors', () => {
    expect(isTransientError(new Error('Invalid API key'))).toBe(false)
    expect(isTransientError(new Error('Bad request'))).toBe(false)
    expect(isTransientError(new Error('Not found'))).toBe(false)
  })

  it('returns false for non-Error values', () => {
    expect(isTransientError('string error')).toBe(false)
    expect(isTransientError(null)).toBe(false)
    expect(isTransientError(undefined)).toBe(false)
  })
})
