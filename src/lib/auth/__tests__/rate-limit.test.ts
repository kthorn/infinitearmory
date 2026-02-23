import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRateLimiter } from '../rate-limit'

describe('createRateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('allows requests within limit', () => {
    const limiter = createRateLimiter('test1', { windowMs: 1000, maxRequests: 3 })

    expect(limiter.check('user1').allowed).toBe(true)
    expect(limiter.check('user1').allowed).toBe(true)
    expect(limiter.check('user1').allowed).toBe(true)
  })

  it('blocks requests over limit', () => {
    const limiter = createRateLimiter('test2', { windowMs: 1000, maxRequests: 2 })

    expect(limiter.check('user1').allowed).toBe(true)
    expect(limiter.check('user1').allowed).toBe(true)
    expect(limiter.check('user1').allowed).toBe(false)
    expect(limiter.check('user1').remaining).toBe(0)
  })

  it('tracks different keys separately', () => {
    const limiter = createRateLimiter('test3', { windowMs: 1000, maxRequests: 1 })

    expect(limiter.check('user1').allowed).toBe(true)
    expect(limiter.check('user2').allowed).toBe(true)
    expect(limiter.check('user1').allowed).toBe(false)
    expect(limiter.check('user2').allowed).toBe(false)
  })

  it('resets after window expires', () => {
    const limiter = createRateLimiter('test4', { windowMs: 1000, maxRequests: 1 })

    expect(limiter.check('user1').allowed).toBe(true)
    expect(limiter.check('user1').allowed).toBe(false)

    // Advance time past window
    vi.advanceTimersByTime(1001)

    expect(limiter.check('user1').allowed).toBe(true)
  })

  it('returns correct remaining count', () => {
    const limiter = createRateLimiter('test5', { windowMs: 1000, maxRequests: 3 })

    expect(limiter.check('user1').remaining).toBe(2)
    expect(limiter.check('user1').remaining).toBe(1)
    expect(limiter.check('user1').remaining).toBe(0)
  })
})
