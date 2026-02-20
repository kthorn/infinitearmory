# Component 6: Generation Pipeline Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement the job-row pattern for weapon generation, orchestrating text and image generation with status updates and error handling.

**Architecture:** "Poor man's job queue" using database rows. Generation runs inline after API response. Status updates at each step. Retry logic for transient failures.

**Tech Stack:** Prisma, AI Providers, S3 Storage

---

## Task 1: Create Retry Utility

**Files:**
- Create: `src/lib/generation/retry.ts`

**Step 1: Create retry utility**

Create file `src/lib/generation/retry.ts`:

```typescript
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
git add src/lib/generation/retry.ts && git commit -m "feat: add retry utility"
```

---

## Task 2: Create Generation Orchestrator

**Files:**
- Create: `src/lib/generation/orchestrator.ts`

**Step 1: Create orchestrator**

Create file `src/lib/generation/orchestrator.ts`:

```typescript
import { db } from '@/lib/db'
import { getTextProvider, getImageProvider, buildImagePrompt } from '@/lib/providers'
import { uploadImage } from '@/lib/storage'
import { generationOptionsSchema } from '@/lib/schemas'
import { WEAPON_STATUS } from '@/types'
import { withRetry, isTransientError } from './retry'
import type { GenerationOptions } from '@/lib/schemas'

const PROMPT_VERSION = 'v1'

export interface GenerateWeaponParams {
  weaponId: string
  userPrompt: string
  options: GenerationOptions
}

/**
 * Run the full weapon generation pipeline
 * Updates database status at each step
 */
export async function generateWeapon({ weaponId, userPrompt, options }: GenerateWeaponParams): Promise<void> {
  try {
    // Step 1: Generate text (description + stats)
    await updateStatus(weaponId, WEAPON_STATUS.GENERATING_TEXT)

    const textProvider = getTextProvider()
    const textResult = await withRetry(
      () => textProvider.generateWeapon(userPrompt, options),
      {
        maxAttempts: 2,
        delayMs: 2000,
        shouldRetry: isTransientError,
      }
    )

    // Save text results
    await db.weapon.update({
      where: { id: weaponId },
      data: {
        weaponSpec: JSON.stringify(textResult.weaponSpec),
        descriptionMd: textResult.descriptionMd,
        textModel: textResult.model,
        promptVersion: PROMPT_VERSION,
      },
    })

    // Step 2: Generate image
    await updateStatus(weaponId, WEAPON_STATUS.GENERATING_IMAGE)

    const imageProvider = getImageProvider()
    const imagePrompt = buildImagePrompt(textResult.weaponSpec, options.style)

    const imageResult = await withRetry(
      () => imageProvider.generateImage(imagePrompt),
      {
        maxAttempts: 2,
        delayMs: 3000,
        shouldRetry: isTransientError,
      }
    )

    // Upload image to storage
    const { url: imageUrl } = await uploadImage({
      weaponId,
      imageData: imageResult.imageData,
    })

    // Save image results and mark done
    await db.weapon.update({
      where: { id: weaponId },
      data: {
        imageUrl,
        imagePrompt,
        imageModel: imageResult.model,
        status: WEAPON_STATUS.DONE,
      },
    })
  } catch (error) {
    // Mark as error
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    await db.weapon.update({
      where: { id: weaponId },
      data: {
        status: WEAPON_STATUS.ERROR,
        errorMessage,
      },
    })

    // Re-throw for logging
    throw error
  }
}

/**
 * Regenerate just the image for an existing weapon
 */
export async function regenerateImage(weaponId: string, style?: string): Promise<void> {
  const weapon = await db.weapon.findUnique({ where: { id: weaponId } })
  if (!weapon) {
    throw new Error(`Weapon not found: ${weaponId}`)
  }
  if (!weapon.weaponSpec) {
    throw new Error(`Weapon has no spec: ${weaponId}`)
  }

  try {
    await updateStatus(weaponId, WEAPON_STATUS.GENERATING_IMAGE)

    const weaponSpec = JSON.parse(weapon.weaponSpec)
    const options = JSON.parse(weapon.options)
    const imageStyle = style ?? options.style ?? 'fantasy_art'

    const imageProvider = getImageProvider()
    const imagePrompt = buildImagePrompt(weaponSpec, imageStyle)

    const imageResult = await withRetry(
      () => imageProvider.generateImage(imagePrompt),
      {
        maxAttempts: 2,
        delayMs: 3000,
        shouldRetry: isTransientError,
      }
    )

    const { url: imageUrl } = await uploadImage({
      weaponId,
      imageData: imageResult.imageData,
    })

    await db.weapon.update({
      where: { id: weaponId },
      data: {
        imageUrl,
        imagePrompt,
        imageModel: imageResult.model,
        status: WEAPON_STATUS.DONE,
      },
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    await db.weapon.update({
      where: { id: weaponId },
      data: {
        status: WEAPON_STATUS.ERROR,
        errorMessage,
      },
    })
    throw error
  }
}

/**
 * Reroll stats and regenerate everything
 */
export async function rerollWeapon(weaponId: string): Promise<void> {
  const weapon = await db.weapon.findUnique({ where: { id: weaponId } })
  if (!weapon) {
    throw new Error(`Weapon not found: ${weaponId}`)
  }

  const options = generationOptionsSchema.parse(JSON.parse(weapon.options))

  // Clear existing results
  await db.weapon.update({
    where: { id: weaponId },
    data: {
      weaponSpec: null,
      descriptionMd: null,
      imageUrl: null,
      imagePrompt: null,
      errorMessage: null,
      status: WEAPON_STATUS.QUEUED,
    },
  })

  // Run full pipeline
  await generateWeapon({
    weaponId,
    userPrompt: weapon.userPrompt,
    options,
  })
}

async function updateStatus(weaponId: string, status: string): Promise<void> {
  await db.weapon.update({
    where: { id: weaponId },
    data: { status, errorMessage: null },
  })
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
git add src/lib/generation/orchestrator.ts && git commit -m "feat: add generation orchestrator"
```

---

## Task 3: Create Background Runner

**Files:**
- Create: `src/lib/generation/background.ts`

**Step 1: Create background execution helper**

Create file `src/lib/generation/background.ts`:

```typescript
import { generateWeapon, type GenerateWeaponParams } from './orchestrator'

/**
 * Run weapon generation in the background (fire-and-forget)
 *
 * This is used after returning the API response to the client.
 * Errors are caught and logged, not propagated.
 */
export function runGenerationInBackground(params: GenerateWeaponParams): void {
  // Use setImmediate to run after current event loop
  setImmediate(async () => {
    try {
      await generateWeapon(params)
      console.log(`Generation completed: ${params.weaponId}`)
    } catch (error) {
      // Error is already persisted to DB in orchestrator
      console.error(`Generation failed: ${params.weaponId}`, error)
    }
  })
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
git add src/lib/generation/background.ts && git commit -m "feat: add background generation runner"
```

---

## Task 4: Create Generation Index

**Files:**
- Create: `src/lib/generation/index.ts`

**Step 1: Create generation module index**

Create file `src/lib/generation/index.ts`:

```typescript
export { generateWeapon, regenerateImage, rerollWeapon } from './orchestrator'
export type { GenerateWeaponParams } from './orchestrator'
export { runGenerationInBackground } from './background'
export { withRetry, isTransientError } from './retry'
```

**Step 2: Remove .gitkeep**

Run:
```bash
rm -f src/lib/generation/.gitkeep
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
git add -A && git commit -m "feat: add generation module index"
```

---

## Task 5: Write Retry Unit Tests

**Files:**
- Create: `src/lib/generation/__tests__/retry.test.ts`

**Step 1: Create retry tests**

Create file `src/lib/generation/__tests__/retry.test.ts`:

```typescript
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
git add src/lib/generation/__tests__/retry.test.ts && git commit -m "feat: add retry unit tests"
```

---

## Task 6: Final Verification

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

**Step 3: Final commit**

Run:
```bash
git add -A && git commit -m "chore: complete generation pipeline component" --allow-empty
```

---

## Component 6 Complete

**Summary of what was created:**
- Retry utility with exponential backoff
- Transient error detection for smart retries
- Generation orchestrator with status updates
- Text generation step with retry
- Image generation step with retry and storage upload
- Regenerate image function
- Reroll weapon function
- Background execution helper
- Unit tests for retry logic

**Pipeline Flow:**
1. `POST /api/weapons` creates weapon row with `status=queued`
2. `runGenerationInBackground()` starts after response
3. Status → `generating_text`, call text provider, save results
4. Status → `generating_image`, call image provider, upload to S3
5. Status → `done` (or `error` with message)
6. Client polls `GET /api/weapons/:id` until done

**Next:** Proceed to Component 7 - API Routes
