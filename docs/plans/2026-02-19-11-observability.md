# Component 11: Observability Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add structured logging and basic metrics for monitoring generation performance and errors.

**Architecture:** Structured JSON logging with context (weaponId, step, duration). Console-based for Fly.io log aggregation. Optional Sentry integration for error tracking.

**Tech Stack:** Native console logging, optional Sentry SDK

---

## Task 1: Create Logger Utility

**Files:**
- Create: `src/lib/observability/logger.ts`

**Step 1: Create structured logger**

Create file `src/lib/observability/logger.ts`:

```typescript
import { env } from '@/lib/env'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  weaponId?: string
  step?: string
  duration?: number
  model?: string
  retries?: number
  [key: string]: unknown
}

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context?: LogContext
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

// Only show debug logs in development
const MIN_LEVEL = env.NODE_ENV === 'development' ? 'debug' : 'info'

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[MIN_LEVEL]
}

function formatLog(entry: LogEntry): string {
  if (env.NODE_ENV === 'development') {
    // Pretty format for development
    const contextStr = entry.context ? ` ${JSON.stringify(entry.context)}` : ''
    return `[${entry.level.toUpperCase()}] ${entry.message}${contextStr}`
  }

  // JSON format for production (Fly.io log aggregation)
  return JSON.stringify(entry)
}

function log(level: LogLevel, message: string, context?: LogContext): void {
  if (!shouldLog(level)) {
    return
  }

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(context && { context }),
  }

  const formatted = formatLog(entry)

  switch (level) {
    case 'debug':
    case 'info':
      console.log(formatted)
      break
    case 'warn':
      console.warn(formatted)
      break
    case 'error':
      console.error(formatted)
      break
  }
}

export const logger = {
  debug: (message: string, context?: LogContext) => log('debug', message, context),
  info: (message: string, context?: LogContext) => log('info', message, context),
  warn: (message: string, context?: LogContext) => log('warn', message, context),
  error: (message: string, context?: LogContext) => log('error', message, context),

  /**
   * Log generation step with timing
   */
  generation: (
    event: 'start' | 'text_complete' | 'image_complete' | 'done' | 'error',
    context: LogContext
  ) => {
    const message = `Generation ${event}`
    if (event === 'error') {
      log('error', message, context)
    } else {
      log('info', message, context)
    }
  },

  /**
   * Log API request
   */
  request: (method: string, path: string, statusCode: number, durationMs: number) => {
    log('info', `${method} ${path}`, {
      statusCode,
      duration: durationMs,
    })
  },
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
git add src/lib/observability/logger.ts && git commit -m "feat: add structured logger"
```

---

## Task 2: Create Timer Utility

**Files:**
- Create: `src/lib/observability/timer.ts`

**Step 1: Create timer utility**

Create file `src/lib/observability/timer.ts`:

```typescript
export interface Timer {
  elapsed(): number
  stop(): number
}

/**
 * Create a simple timer for measuring durations
 */
export function createTimer(): Timer {
  const startTime = Date.now()
  let endTime: number | null = null

  return {
    /**
     * Get elapsed time in milliseconds (can be called multiple times)
     */
    elapsed(): number {
      return (endTime ?? Date.now()) - startTime
    },

    /**
     * Stop the timer and return final duration
     */
    stop(): number {
      if (endTime === null) {
        endTime = Date.now()
      }
      return endTime - startTime
    },
  }
}

/**
 * Measure the duration of an async function
 */
export async function measureAsync<T>(
  fn: () => Promise<T>
): Promise<{ result: T; durationMs: number }> {
  const timer = createTimer()
  const result = await fn()
  return { result, durationMs: timer.stop() }
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
git add src/lib/observability/timer.ts && git commit -m "feat: add timer utility"
```

---

## Task 3: Create Metrics Collector

**Files:**
- Create: `src/lib/observability/metrics.ts`

**Step 1: Create metrics collector**

Create file `src/lib/observability/metrics.ts`:

```typescript
interface GenerationMetric {
  weaponId: string
  textDurationMs: number
  imageDurationMs: number
  totalDurationMs: number
  textModel: string
  imageModel: string
  success: boolean
  timestamp: Date
}

interface MetricsSummary {
  totalGenerations: number
  successfulGenerations: number
  failedGenerations: number
  avgTextDurationMs: number
  avgImageDurationMs: number
  avgTotalDurationMs: number
}

// In-memory metrics store (resets on restart)
// For a more robust solution, use a time-series DB
const metrics: GenerationMetric[] = []
const MAX_METRICS = 1000 // Keep last N metrics

/**
 * Record a generation metric
 */
export function recordGenerationMetric(metric: Omit<GenerationMetric, 'timestamp'>): void {
  metrics.push({
    ...metric,
    timestamp: new Date(),
  })

  // Trim old metrics
  if (metrics.length > MAX_METRICS) {
    metrics.splice(0, metrics.length - MAX_METRICS)
  }
}

/**
 * Get metrics summary for the last N minutes
 */
export function getMetricsSummary(lastMinutes = 60): MetricsSummary {
  const cutoff = new Date(Date.now() - lastMinutes * 60 * 1000)
  const recent = metrics.filter((m) => m.timestamp > cutoff)

  if (recent.length === 0) {
    return {
      totalGenerations: 0,
      successfulGenerations: 0,
      failedGenerations: 0,
      avgTextDurationMs: 0,
      avgImageDurationMs: 0,
      avgTotalDurationMs: 0,
    }
  }

  const successful = recent.filter((m) => m.success)

  return {
    totalGenerations: recent.length,
    successfulGenerations: successful.length,
    failedGenerations: recent.length - successful.length,
    avgTextDurationMs: avg(successful.map((m) => m.textDurationMs)),
    avgImageDurationMs: avg(successful.map((m) => m.imageDurationMs)),
    avgTotalDurationMs: avg(successful.map((m) => m.totalDurationMs)),
  }
}

function avg(values: number[]): number {
  if (values.length === 0) return 0
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length)
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
git add src/lib/observability/metrics.ts && git commit -m "feat: add metrics collector"
```

---

## Task 4: Create Observability Module Index

**Files:**
- Create: `src/lib/observability/index.ts`

**Step 1: Create observability index**

Create file `src/lib/observability/index.ts`:

```typescript
export { logger } from './logger'
export { createTimer, measureAsync, type Timer } from './timer'
export { recordGenerationMetric, getMetricsSummary } from './metrics'
```

**Step 2: Remove .gitkeep**

Run:
```bash
rm -f src/lib/observability/.gitkeep
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
git add src/lib/observability && git commit -m "feat: add observability module index"
```

---

## Task 5: Update Generation Orchestrator with Logging

**Files:**
- Modify: `src/lib/generation/orchestrator.ts`

**Step 1: Add logging to orchestrator**

Update the `generateWeapon` function in `src/lib/generation/orchestrator.ts` to add logging:

```typescript
// Add imports at top
import { logger, createTimer, recordGenerationMetric } from '@/lib/observability'

// Update generateWeapon function:
export async function generateWeapon({ weaponId, userPrompt, options }: GenerateWeaponParams): Promise<void> {
  const totalTimer = createTimer()
  let textDurationMs = 0
  let imageDurationMs = 0
  let textModel = ''
  let imageModel = ''

  try {
    logger.generation('start', { weaponId, prompt: userPrompt.slice(0, 50) })

    // Step 1: Generate text
    await updateStatus(weaponId, WEAPON_STATUS.GENERATING_TEXT)
    const textTimer = createTimer()

    const textProvider = getTextProvider()
    const textResult = await withRetry(
      () => textProvider.generateWeapon(userPrompt, options),
      {
        maxAttempts: 2,
        delayMs: 2000,
        shouldRetry: isTransientError,
      }
    )

    textDurationMs = textTimer.stop()
    textModel = textResult.model
    logger.generation('text_complete', { weaponId, duration: textDurationMs, model: textModel })

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
    const imageTimer = createTimer()

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

    imageDurationMs = imageTimer.stop()
    imageModel = imageResult.model
    logger.generation('image_complete', { weaponId, duration: imageDurationMs, model: imageModel })

    // Upload image
    const { url: imageUrl } = await uploadImage({
      weaponId,
      imageData: imageResult.imageData,
    })

    // Save and complete
    await db.weapon.update({
      where: { id: weaponId },
      data: {
        imageUrl,
        imagePrompt,
        imageModel: imageResult.model,
        status: WEAPON_STATUS.DONE,
      },
    })

    const totalDurationMs = totalTimer.stop()
    logger.generation('done', { weaponId, duration: totalDurationMs })

    // Record metrics
    recordGenerationMetric({
      weaponId,
      textDurationMs,
      imageDurationMs,
      totalDurationMs,
      textModel,
      imageModel,
      success: true,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const totalDurationMs = totalTimer.stop()

    logger.generation('error', { weaponId, error: errorMessage, duration: totalDurationMs })

    // Record failed metric
    recordGenerationMetric({
      weaponId,
      textDurationMs,
      imageDurationMs,
      totalDurationMs,
      textModel,
      imageModel,
      success: false,
    })

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
git add src/lib/generation/orchestrator.ts && git commit -m "feat: add logging to generation orchestrator"
```

---

## Task 6: Add Metrics API Endpoint

**Files:**
- Create: `src/app/api/metrics/route.ts`

**Step 1: Create metrics endpoint**

Create file `src/app/api/metrics/route.ts`:

```typescript
import { NextResponse } from 'next/server'
import { getMetricsSummary } from '@/lib/observability'

/**
 * GET /api/metrics - Get generation metrics
 */
export async function GET() {
  const summary = getMetricsSummary(60) // Last 60 minutes

  return NextResponse.json({
    period: '60m',
    ...summary,
    timestamp: new Date().toISOString(),
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
git add src/app/api/metrics/route.ts && git commit -m "feat: add metrics API endpoint"
```

---

## Task 7: Write Logger Tests

**Files:**
- Create: `src/lib/observability/__tests__/timer.test.ts`

**Step 1: Create timer tests**

Create file `src/lib/observability/__tests__/timer.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createTimer, measureAsync } from '../timer'

describe('createTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('measures elapsed time', () => {
    const timer = createTimer()

    vi.advanceTimersByTime(100)
    expect(timer.elapsed()).toBe(100)

    vi.advanceTimersByTime(50)
    expect(timer.elapsed()).toBe(150)
  })

  it('stops and returns final duration', () => {
    const timer = createTimer()

    vi.advanceTimersByTime(100)
    const duration = timer.stop()

    expect(duration).toBe(100)

    // After stop, elapsed should return same value
    vi.advanceTimersByTime(50)
    expect(timer.elapsed()).toBe(100)
  })
})

describe('measureAsync', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('measures async function duration', async () => {
    const fn = vi.fn().mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100))
      return 'result'
    })

    const promise = measureAsync(fn)
    vi.advanceTimersByTime(100)
    const { result, durationMs } = await promise

    expect(result).toBe('result')
    expect(durationMs).toBeGreaterThanOrEqual(100)
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
git add src/lib/observability/__tests__/timer.test.ts && git commit -m "feat: add timer tests"
```

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

**Step 3: Final commit**

Run:
```bash
git add -A && git commit -m "chore: complete observability component" --allow-empty
```

---

## Component 11 Complete

**Summary of what was created:**
- Structured JSON logger with levels (debug, info, warn, error)
- Timer utility for measuring durations
- In-memory metrics collector
- Generation event logging
- Metrics API endpoint
- Timer unit tests

**Log Format (Production):**
```json
{"timestamp":"2026-02-19T12:00:00.000Z","level":"info","message":"Generation done","context":{"weaponId":"abc123","duration":15234}}
```

**Metrics Endpoint:**
```
GET /api/metrics
{
  "period": "60m",
  "totalGenerations": 42,
  "successfulGenerations": 40,
  "failedGenerations": 2,
  "avgTextDurationMs": 3500,
  "avgImageDurationMs": 8000,
  "avgTotalDurationMs": 12000
}
```

**Next:** Proceed to Component 12 - Fly Deployment
