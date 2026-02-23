interface RateLimitEntry {
  count: number
  resetTime: number
}

interface RateLimitConfig {
  windowMs: number
  maxRequests: number
}

const stores = new Map<string, Map<string, RateLimitEntry>>()

/**
 * Simple in-memory rate limiter
 */
export function createRateLimiter(name: string, config: RateLimitConfig) {
  // Create store for this limiter
  if (!stores.has(name)) {
    stores.set(name, new Map())
  }
  const store = stores.get(name)!

  return {
    /**
     * Check if request is allowed
     * @param key - Usually the IP address
     * @returns Object with allowed status and remaining requests
     */
    check(key: string): { allowed: boolean; remaining: number; resetIn: number } {
      const now = Date.now()

      // Lazy cleanup: remove expired entries on access
      if (store.size > 1000) {
        for (const [k, e] of store.entries()) {
          if (now > e.resetTime) {
            store.delete(k)
          }
        }
      }

      let entry = store.get(key)

      // Create new entry or reset if expired
      if (!entry || now > entry.resetTime) {
        entry = {
          count: 0,
          resetTime: now + config.windowMs,
        }
        store.set(key, entry)
      }

      const remaining = Math.max(0, config.maxRequests - entry.count)
      const resetIn = Math.max(0, entry.resetTime - now)

      if (entry.count >= config.maxRequests) {
        return { allowed: false, remaining: 0, resetIn }
      }

      entry.count++
      return { allowed: true, remaining: remaining - 1, resetIn }
    },
  }
}

// Pre-configured rate limiters for different endpoints
export const rateLimiters = {
  createWeapon: createRateLimiter('createWeapon', {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
  }),
  regenerateImage: createRateLimiter('regenerateImage', {
    windowMs: 60 * 1000,
    maxRequests: 5,
  }),
  rerollStats: createRateLimiter('rerollStats', {
    windowMs: 60 * 1000,
    maxRequests: 5,
  }),
  transcribe: createRateLimiter('transcribe', {
    windowMs: 60 * 1000,
    maxRequests: 5,
  }),
}
