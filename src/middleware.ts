import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyBasicAuth, createAuthChallengeHeaders, rateLimiters } from '@/lib/auth'
import { resetIdleTimer } from '@/lib/idle-shutdown'

// Auth-required paths: only mutating API endpoints require auth.
// The creation UI is public; auth is triggered when the user submits.
const AUTH_REQUIRED_PATHS: string[] = []
const AUTH_REQUIRED_API = [
  { method: 'POST', pattern: /^\/api\/weapons$/ },
  { method: 'DELETE', pattern: /^\/api\/weapons\/[\w-]+$/ },
  { method: 'POST', pattern: /^\/api\/weapons\/[\w-]+\/regenerate-image$/ },
  { method: 'POST', pattern: /^\/api\/weapons\/[\w-]+\/reroll-stats$/ },
  { method: 'POST', pattern: /^\/api\/transcribe$/ },
]

// Paths that are rate limited (mapped to their limiters)
const RATE_LIMITED_PATHS: Record<string, keyof typeof rateLimiters> = {
  'POST:/api/weapons': 'createWeapon',
  'POST:/api/transcribe': 'transcribe',
}

// Dynamic rate limited paths (using regex)
const DYNAMIC_RATE_LIMITED_PATHS = [
  { pattern: /^POST:\/api\/weapons\/[\w-]+\/regenerate-image$/, limiter: 'regenerateImage' as const },
  { pattern: /^POST:\/api\/weapons\/[\w-]+\/reroll-stats$/, limiter: 'rerollStats' as const },
]

export function middleware(request: NextRequest) {
  resetIdleTimer()

  const path = request.nextUrl.pathname
  const method = request.method

  // Determine if this route requires auth
  const isAuthRequired =
    AUTH_REQUIRED_PATHS.includes(path) ||
    AUTH_REQUIRED_API.some((r) => r.method === method && r.pattern.test(path))

  if (isAuthRequired) {
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
