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

  // If no password configured or empty, skip auth (dev convenience).
  // IMPORTANT: In production, AUTH_PASSWORD must be validated at startup
  // via env.ts to prevent accidental fail-open. Add AUTH_PASSWORD to the
  // required env vars in src/lib/env.ts when NODE_ENV === 'production'.
  if (!authPassword) {
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
