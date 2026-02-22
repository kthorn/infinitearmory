export interface RetryOptions {
  maxAttempts: number
  delayMs: number
  backoffMultiplier?: number
  shouldRetry?: (error: unknown) => boolean
}

const defaultOptions: RetryOptions = {
  maxAttempts: 3,
  delayMs: 1000,
  backoffMultiplier: 2,
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const opts = { ...defaultOptions, ...options }
  let lastError: unknown

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      // Check if we should retry this error
      if (opts.shouldRetry && !opts.shouldRetry(error)) {
        throw error
      }

      // Don't wait after the last attempt
      if (attempt < opts.maxAttempts) {
        const delay = opts.delayMs * Math.pow(opts.backoffMultiplier ?? 1, attempt - 1)
        await sleep(delay)
      }
    }
  }

  throw lastError
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Check if an error is transient and worth retrying
 */
export function isTransientError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()

    // Rate limits
    if (message.includes('rate limit') || message.includes('429')) {
      return true
    }

    // Timeouts
    if (message.includes('timeout') || message.includes('timed out')) {
      return true
    }

    // Network errors
    if (message.includes('network') || message.includes('connection')) {
      return true
    }

    // Server errors (5xx)
    if (message.includes('500') || message.includes('502') || message.includes('503')) {
      return true
    }
  }

  return false
}
