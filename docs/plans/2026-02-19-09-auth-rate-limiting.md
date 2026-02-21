# Component 9: Auth & Rate Limiting Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add simple authentication and rate limiting to protect the entire app (API and UI routes) from unauthorized access and abuse.

**Architecture:** Basic auth with single shared password. In-memory rate limiting per IP on generation endpoints. Next.js middleware for request interception.

**Tech Stack:** Next.js Middleware, Basic Auth

**Prerequisites:** Components 1 (Core Infrastructure - provides `src/lib/env.ts`, vitest config, `test:run` script) and 7 (API Routes - provides endpoint structure) must be complete.

---

## Task 1: Create Basic Auth Utility

**Files:**
- Create: `src/lib/auth/basic-auth.ts`

**Step 1: Create basic auth utility**

Create file `src/lib/auth/basic-auth.ts`:

```typescript
// Note: This module is used by Next.js middleware (Edge Runtime).
// Do NOT import from '@/lib/env' here — it uses 'server-only' which
// is incompatible with Edge Runtime. Read process.env directly instead.

export interface AuthResult {
  authenticated: boolean
  error?: string
}

/**
 * Verify Basic Auth credentials
 */
export function verifyBasicAuth(authHeader: string | null): AuthResult {
  const authPassword = process.env.AUTH_PASSWORD

  // If no password configured, skip auth (dev only)
  if (authPassword == null) {
    return { authenticated: true }
  }

  if (!authHeader) {
    return { authenticated: false, error: 'Missing Authorization header' }
  }

  if (!authHeader.startsWith('Basic ')) {
    return { authenticated: false, error: 'Invalid Authorization header format' }
  }

  try {
    const base64Credentials = authHeader.slice(6)
    const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8')
    const colonIndex = credentials.indexOf(':')
    const password = colonIndex !== -1 ? credentials.slice(colonIndex + 1) : ''

    if (password === authPassword) {
      return { authenticated: true }
    }

    return { authenticated: false, error: 'Invalid credentials' }
  } catch {
    return { authenticated: false, error: 'Invalid Authorization header' }
  }
}

/**
 * Create Basic Auth challenge response headers
 */
export function createAuthChallengeHeaders(): Headers {
  const headers = new Headers()
  headers.set('WWW-Authenticate', 'Basic realm="Weapon Generator"')
  return headers
}
```

**Step 2: Verify compilation**

Run:
```bash
npx tsc --noEmit
```

Expected: No errors.

**Step 3: Commit**

Run:
```bash
git add src/lib/auth/basic-auth.ts && git commit -m "feat: add basic auth utility"
```

---

## Task 2: Create Rate Limiter

**Files:**
- Create: `src/lib/auth/rate-limit.ts`

**Step 1: Create rate limiter**

Create file `src/lib/auth/rate-limit.ts`:

```typescript
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
}
```

**Step 2: Verify compilation**

Run:
```bash
npx tsc --noEmit
```

Expected: No errors.

**Step 3: Commit**

Run:
```bash
git add src/lib/auth/rate-limit.ts && git commit -m "feat: add rate limiter"
```

---

## Task 3: Create Auth Module Index

**Files:**
- Create: `src/lib/auth/index.ts`

**Step 1: Create auth index**

Create file `src/lib/auth/index.ts`:

```typescript
export { verifyBasicAuth, createAuthChallengeHeaders } from './basic-auth'
export type { AuthResult } from './basic-auth'
export { createRateLimiter, rateLimiters } from './rate-limit'
```

**Step 2: Remove .gitkeep**

Run:
```bash
rm -f src/lib/auth/.gitkeep
```

**Step 3: Verify compilation**

Run:
```bash
npx tsc --noEmit
```

Expected: No errors.

**Step 4: Commit**

Run:
```bash
git add src/lib/auth && git commit -m "feat: add auth module index"
```

---

## Task 4: Create Next.js Middleware

**Files:**
- Create: `src/middleware.ts`

**Step 1: Create middleware**

Create file `src/middleware.ts`:

```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyBasicAuth, createAuthChallengeHeaders, rateLimiters } from '@/lib/auth'

// Public paths that skip authentication
const PUBLIC_PATHS = ['/api/health']

// Paths that are rate limited (mapped to their limiters)
const RATE_LIMITED_PATHS: Record<string, keyof typeof rateLimiters> = {
  'POST:/api/weapons': 'createWeapon',
}

// Dynamic rate limited paths (using regex)
const DYNAMIC_RATE_LIMITED_PATHS = [
  { pattern: /^POST:\/api\/weapons\/[\w-]+\/regenerate-image$/, limiter: 'regenerateImage' as const },
  { pattern: /^POST:\/api\/weapons\/[\w-]+\/reroll-stats$/, limiter: 'rerollStats' as const },
]

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname

  // Skip auth for public paths
  const isPublic = PUBLIC_PATHS.some(
    (p) => path === p || path.startsWith(p + '/')
  )

  if (!isPublic) {
    const authResult = verifyBasicAuth(request.headers.get('authorization'))

    if (!authResult.authenticated) {
      const headers = createAuthChallengeHeaders()
      headers.set('Content-Type', 'application/json')
      return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers,
      })
    }
  }

  // Check rate limiting for API endpoints
  if (path.startsWith('/api/')) {
    const methodPath = `${request.method}:${path}`

    // Check static paths
    let limiterName = RATE_LIMITED_PATHS[methodPath]

    // Check dynamic paths
    if (!limiterName) {
      const dynamicMatch = DYNAMIC_RATE_LIMITED_PATHS.find((p) => p.pattern.test(methodPath))
      if (dynamicMatch) {
        limiterName = dynamicMatch.limiter
      }
    }

    if (limiterName) {
      const ip = getClientIP(request)
      const limiter = rateLimiters[limiterName]
      const result = limiter.check(ip)

      if (!result.allowed) {
        return new NextResponse(
          JSON.stringify({
            error: 'Too many requests',
            retryAfter: Math.ceil(result.resetIn / 1000),
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'Retry-After': String(Math.ceil(result.resetIn / 1000)),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': String(Math.ceil(result.resetIn / 1000)),
            },
          }
        )
      }

      // Add rate limit headers to response
      const response = NextResponse.next()
      response.headers.set('X-RateLimit-Remaining', String(result.remaining))
      response.headers.set('X-RateLimit-Reset', String(Math.ceil(result.resetIn / 1000)))
      return response
    }
  }

  return NextResponse.next()
}

function getClientIP(request: NextRequest): string {
  // Check various headers for the real IP
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() ?? 'unknown'
  }

  const realIP = request.headers.get('x-real-ip')
  if (realIP) {
    return realIP
  }

  // Fallback
  return 'unknown'
}

export const config = {
  matcher: [
    // Match all paths except static files and Next.js internals
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
```

**Step 2: Verify compilation**

Run:
```bash
npx tsc --noEmit
```

Expected: No errors.

**Step 3: Commit**

Run:
```bash
git add src/middleware.ts && git commit -m "feat: add auth and rate limiting middleware"
```

---

## Task 5: Write Rate Limiter Tests

**Files:**
- Create: `src/lib/auth/__tests__/rate-limit.test.ts`

**Step 1: Create rate limiter tests**

Create file `src/lib/auth/__tests__/rate-limit.test.ts`:

```typescript
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
```

**Step 2: Run tests**

Run:
```bash
npm run test:run
```

Expected: All tests pass.

**Step 3: Commit**

Run:
```bash
git add src/lib/auth/__tests__/rate-limit.test.ts && git commit -m "feat: add rate limiter tests"
```

---

## Task 6: Write Basic Auth Tests

**Files:**
- Create: `src/lib/auth/__tests__/basic-auth.test.ts`

**Step 1: Create basic auth tests**

Create file `src/lib/auth/__tests__/basic-auth.test.ts`:

```typescript
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
```

**Step 2: Run tests**

Run:
```bash
npm run test:run
```

Expected: All tests pass.

**Step 3: Commit**

Run:
```bash
git add src/lib/auth/__tests__/basic-auth.test.ts && git commit -m "feat: add basic auth tests"
```

---

## Task 7: Verify .env.example

**Files:**
- Verify: `.env.example`

**Step 1: Verify AUTH_PASSWORD exists**

`.env.example` should already contain `AUTH_PASSWORD=` (added during Component 1). Verify it is present. If missing, add it under an `# Auth` section and commit:

```bash
git add .env.example && git commit -m "docs: add auth password to env example"
```

No commit needed if already present.

---

## Task 8: Final Verification

**Files:** None (verification only)

**Step 1: Run full build**

Run:
```bash
npm run build
```

Expected: Build succeeds.

**Step 2: Run tests**

Run:
```bash
npm run test:run
```

Expected: All tests pass.

**Step 3: Final commit (if any uncommitted changes remain)**

Run:
```bash
git add -A && git diff --cached --quiet || git commit -m "chore: complete auth and rate limiting component"
```

---

## Component 9 Complete

**Summary of what was created:**
- Basic auth utility with password verification
- In-memory rate limiter with configurable windows
- Pre-configured rate limiters for generation endpoints
- Next.js middleware for auth and rate limiting
- Rate limit headers in responses
- Unit tests for auth and rate limiting

**Rate Limits:**
| Endpoint | Limit |
|----------|-------|
| POST /api/weapons | 10/minute |
| POST /api/weapons/:id/regenerate-image | 5/minute |
| POST /api/weapons/:id/reroll-stats | 5/minute |

**Next:** Proceed to Component 10 - Backup System
