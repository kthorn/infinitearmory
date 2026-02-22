# Speech-to-Text Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a microphone button to the weapon concept textarea that records audio, sends it to OpenAI Whisper for transcription, and appends the text.

**Architecture:** Browser records audio via MediaRecorder → POST to `/api/transcribe` as multipart/form-data → server forwards to OpenAI Whisper API → returns transcribed text → appends to textarea.

**Tech Stack:** React 19 MediaRecorder API, Next.js 16 route handler, OpenAI SDK (`openai` ^6.22.0, already installed), Vitest for tests.

**Design Doc:** `docs/plans/2026-02-22-speech-to-text-design.md`

---

### Task 1: API Route — `/api/transcribe`

**Files:**
- Create: `src/app/api/transcribe/route.ts`
- Test: `src/app/api/transcribe/__tests__/route.test.ts`

**Step 1: Write the failing test**

Create `src/app/api/transcribe/__tests__/route.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock server-only before any imports that use it
vi.mock('server-only', () => ({}))

// Mock env
vi.mock('@/lib/env', () => ({
  env: { OPENAI_API_KEY: 'test-key' },
}))

// Mock OpenAI
const mockCreate = vi.fn()
vi.mock('openai', () => ({
  default: class {
    audio = { transcriptions: { create: mockCreate } }
  },
}))

import { POST } from '../route'

function makeRequest(body?: FormData): Request {
  if (!body) {
    return new Request('http://localhost/api/transcribe', {
      method: 'POST',
    })
  }
  return new Request('http://localhost/api/transcribe', {
    method: 'POST',
    body,
  })
}

describe('POST /api/transcribe', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 400 when no audio file is provided', async () => {
    const form = new FormData()
    const res = await POST(makeRequest(form) as any)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toMatch(/audio/i)
  })

  it('returns transcribed text on success', async () => {
    mockCreate.mockResolvedValue({ text: 'a flaming sword of destiny' })

    const form = new FormData()
    const audioBlob = new Blob(['fake-audio'], { type: 'audio/webm' })
    form.append('audio', audioBlob, 'recording.webm')

    const res = await POST(makeRequest(form) as any)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.text).toBe('a flaming sword of destiny')
  })

  it('calls OpenAI with whisper-1 model', async () => {
    mockCreate.mockResolvedValue({ text: 'test' })

    const form = new FormData()
    const audioBlob = new Blob(['fake-audio'], { type: 'audio/webm' })
    form.append('audio', audioBlob, 'recording.webm')

    await POST(makeRequest(form) as any)

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'whisper-1' })
    )
  })

  it('returns 500 when Whisper API fails', async () => {
    mockCreate.mockRejectedValue(new Error('Whisper failed'))

    const form = new FormData()
    const audioBlob = new Blob(['fake-audio'], { type: 'audio/webm' })
    form.append('audio', audioBlob, 'recording.webm')

    const res = await POST(makeRequest(form) as any)
    expect(res.status).toBe(500)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/api/transcribe/__tests__/route.test.ts`
Expected: FAIL — module `../route` not found

**Step 3: Write the implementation**

Create `src/app/api/transcribe/route.ts`:

```typescript
import { NextRequest } from 'next/server'
import OpenAI, { toFile } from 'openai'
import { env } from '@/lib/env'
import { badRequest, serverError } from '@/lib/api'

const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25MB (Whisper limit)

export async function POST(request: NextRequest) {
  try {
    if (!env.OPENAI_API_KEY) {
      return serverError('OpenAI API key not configured')
    }

    const formData = await request.formData()
    const audioFile = formData.get('audio')

    if (!audioFile || !(audioFile instanceof Blob)) {
      return badRequest('Missing audio file. Send a "audio" field with an audio blob.')
    }

    if (audioFile.size > MAX_FILE_SIZE) {
      return badRequest(`Audio file too large. Maximum size is 25MB.`)
    }

    const client = new OpenAI({ apiKey: env.OPENAI_API_KEY })

    const file = await toFile(audioFile, 'recording.webm')

    const transcription = await client.audio.transcriptions.create({
      model: 'whisper-1',
      file,
    })

    return Response.json({ text: transcription.text })
  } catch (error) {
    console.error('POST /api/transcribe error:', error)
    return serverError('Transcription failed')
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/api/transcribe/__tests__/route.test.ts`
Expected: PASS (all 4 tests)

**Step 5: Commit**

```bash
git add src/app/api/transcribe/
git commit -m "feat: add /api/transcribe route for Whisper speech-to-text"
```

---

### Task 2: `useAudioRecorder` Hook

**Files:**
- Create: `src/hooks/use-audio-recorder.ts`
- Test: `src/hooks/__tests__/use-audio-recorder.test.ts`

**Step 1: Write the failing test**

Create `src/hooks/__tests__/use-audio-recorder.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAudioRecorder } from '../use-audio-recorder'

// Mock MediaRecorder
class MockMediaRecorder {
  state = 'inactive'
  ondataavailable: ((e: any) => void) | null = null
  onstop: (() => void) | null = null
  private chunks: Blob[] = []

  static isTypeSupported = vi.fn(() => true)

  start() {
    this.state = 'recording'
  }

  stop() {
    this.state = 'inactive'
    // Simulate data available then stop
    this.ondataavailable?.({ data: new Blob(['audio-data'], { type: 'audio/webm' }) })
    this.onstop?.()
  }
}

const mockGetUserMedia = vi.fn()
const mockTrackStop = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()

  mockGetUserMedia.mockResolvedValue({
    getTracks: () => [{ stop: mockTrackStop }],
  })

  Object.defineProperty(global.navigator, 'mediaDevices', {
    value: { getUserMedia: mockGetUserMedia },
    configurable: true,
  })

  global.MediaRecorder = MockMediaRecorder as any
})

describe('useAudioRecorder', () => {
  it('starts in idle state', () => {
    const { result } = renderHook(() => useAudioRecorder())
    expect(result.current.isRecording).toBe(false)
    expect(result.current.duration).toBe(0)
    expect(result.current.error).toBeNull()
  })

  it('requests microphone and starts recording', async () => {
    const { result } = renderHook(() => useAudioRecorder())

    await act(async () => {
      await result.current.startRecording()
    })

    expect(mockGetUserMedia).toHaveBeenCalledWith({ audio: true })
    expect(result.current.isRecording).toBe(true)
  })

  it('tracks duration while recording', async () => {
    const { result } = renderHook(() => useAudioRecorder())

    await act(async () => {
      await result.current.startRecording()
    })

    expect(result.current.duration).toBe(0)

    await act(async () => {
      vi.advanceTimersByTime(3000)
    })

    expect(result.current.duration).toBe(3)
  })

  it('stops recording and returns a blob', async () => {
    const { result } = renderHook(() => useAudioRecorder())

    await act(async () => {
      await result.current.startRecording()
    })

    let blob: Blob | undefined
    await act(async () => {
      blob = await result.current.stopRecording()
    })

    expect(blob).toBeInstanceOf(Blob)
    expect(result.current.isRecording).toBe(false)
    expect(result.current.duration).toBe(0)
  })

  it('cleans up media tracks on stop', async () => {
    const { result } = renderHook(() => useAudioRecorder())

    await act(async () => {
      await result.current.startRecording()
    })
    await act(async () => {
      await result.current.stopRecording()
    })

    expect(mockTrackStop).toHaveBeenCalled()
  })

  it('sets error if getUserMedia fails', async () => {
    mockGetUserMedia.mockRejectedValue(new DOMException('Permission denied'))

    const { result } = renderHook(() => useAudioRecorder())

    await act(async () => {
      await result.current.startRecording()
    })

    expect(result.current.isRecording).toBe(false)
    expect(result.current.error).toMatch(/permission/i)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/hooks/__tests__/use-audio-recorder.test.ts`
Expected: FAIL — module not found

**Note:** You may need to install `@testing-library/react` as a dev dependency:
```bash
npm install -D @testing-library/react
```

**Step 3: Write the implementation**

Create `src/hooks/use-audio-recorder.ts`:

```typescript
'use client'

import { useState, useRef, useCallback, useEffect } from 'react'

export interface UseAudioRecorderReturn {
  isRecording: boolean
  duration: number
  startRecording: () => Promise<void>
  stopRecording: () => Promise<Blob>
  error: string | null
}

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [isRecording, setIsRecording] = useState(false)
  const [duration, setDuration] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const chunksRef = useRef<Blob[]>([])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  const startRecording = useCallback(async () => {
    try {
      setError(null)
      chunksRef.current = []

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : undefined

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.start()
      setIsRecording(true)
      setDuration(0)

      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1)
      }, 1000)
    } catch (err) {
      const message =
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? 'Microphone permission denied'
          : 'Failed to access microphone'
      setError(message)
      setIsRecording(false)
    }
  }, [])

  const stopRecording = useCallback((): Promise<Blob> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current
      if (!recorder || recorder.state === 'inactive') {
        resolve(new Blob(chunksRef.current, { type: 'audio/webm' }))
        return
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        chunksRef.current = []
        resolve(blob)
      }

      recorder.stop()
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null

      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }

      setIsRecording(false)
      setDuration(0)
    })
  }, [])

  return { isRecording, duration, startRecording, stopRecording, error }
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/hooks/__tests__/use-audio-recorder.test.ts`
Expected: PASS (all 6 tests)

**Step 5: Commit**

```bash
git add src/hooks/use-audio-recorder.ts src/hooks/__tests__/use-audio-recorder.test.ts
git commit -m "feat: add useAudioRecorder hook for MediaRecorder integration"
```

---

### Task 3: `MicrophoneButton` Component

**Files:**
- Create: `src/components/microphone-button.tsx`

**Step 1: Write the component**

Create `src/components/microphone-button.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useAudioRecorder } from '@/hooks/use-audio-recorder'
import { Spinner } from './ui'

interface MicrophoneButtonProps {
  onTranscription: (text: string) => void
  disabled?: boolean
}

export function MicrophoneButton({ onTranscription, disabled }: MicrophoneButtonProps) {
  const { isRecording, duration, startRecording, stopRecording, error } = useAudioRecorder()
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [transcribeError, setTranscribeError] = useState<string | null>(null)

  // Hide if MediaRecorder is not available
  if (typeof window !== 'undefined' && !navigator.mediaDevices) {
    return null
  }

  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  async function handleClick() {
    setTranscribeError(null)

    if (isRecording) {
      // Stop and transcribe
      const audioBlob = await stopRecording()

      if (audioBlob.size === 0) {
        setTranscribeError('No audio recorded')
        return
      }

      setIsTranscribing(true)
      try {
        const form = new FormData()
        form.append('audio', audioBlob, 'recording.webm')

        const res = await fetch('/api/transcribe', { method: 'POST', body: form })

        if (!res.ok) {
          const data = await res.json().catch(() => null)
          throw new Error(data?.error || 'Transcription failed')
        }

        const { text } = await res.json()
        if (text?.trim()) {
          onTranscription(text.trim())
        }
      } catch (err) {
        setTranscribeError(err instanceof Error ? err.message : 'Transcription failed')
      } finally {
        setIsTranscribing(false)
      }
    } else {
      // Start recording
      await startRecording()
    }
  }

  const displayError = error || transcribeError

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || isTranscribing}
        className={`
          p-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900
          disabled:opacity-50 disabled:cursor-not-allowed
          ${isRecording
            ? 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500 animate-pulse'
            : 'bg-slate-700 hover:bg-slate-600 text-slate-300 focus:ring-slate-500'
          }
        `}
        aria-label={isRecording ? 'Stop recording' : 'Start voice input'}
        title={isRecording ? 'Stop recording' : 'Speak your weapon concept'}
      >
        {isTranscribing ? (
          <Spinner size="sm" />
        ) : isRecording ? (
          // Stop icon (square)
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <rect x="6" y="6" width="12" height="12" rx="1" />
          </svg>
        ) : (
          // Microphone icon
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path d="M12 1a4 4 0 0 0-4 4v6a4 4 0 0 0 8 0V5a4 4 0 0 0-4-4Z" />
            <path d="M6 11a1 1 0 1 0-2 0 8 8 0 0 0 7 7.93V21H8a1 1 0 1 0 0 2h8a1 1 0 1 0 0-2h-3v-2.07A8 8 0 0 0 20 11a1 1 0 1 0-2 0 6 6 0 0 1-12 0Z" />
          </svg>
        )}
      </button>

      {isRecording && (
        <span className="text-sm text-red-400 font-mono tabular-nums">
          {formatDuration(duration)}
        </span>
      )}

      {displayError && (
        <span className="text-sm text-red-400">{displayError}</span>
      )}
    </div>
  )
}
```

**Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: No type errors

**Step 3: Commit**

```bash
git add src/components/microphone-button.tsx
git commit -m "feat: add MicrophoneButton component for voice input"
```

---

### Task 4: Integrate into WeaponForm

**Files:**
- Modify: `src/components/weapon-form.tsx:1-113`

**Step 1: Add the MicrophoneButton import and integrate**

In `src/components/weapon-form.tsx`, add the import:

```typescript
import { MicrophoneButton } from './microphone-button'
```

Replace the textarea container `<div>` (lines 62-75) with:

```tsx
<div>
  <label htmlFor="weapon-prompt" className="block text-sm font-medium text-slate-300 mb-1">Weapon Concept</label>
  <div className="relative">
    <textarea
      id="weapon-prompt"
      value={prompt}
      onChange={(e) => setPrompt(e.target.value)}
      placeholder="Describe your weapon idea... (e.g., 'A sword made of crystallized starlight, wielded by an ancient elven queen')"
      className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent min-h-[100px] resize-y"
      required
      minLength={3}
      maxLength={500}
    />
    <div className="absolute bottom-2 right-2">
      <MicrophoneButton
        onTranscription={(text) => {
          setPrompt((prev) => (prev ? `${prev} ${text}` : text))
        }}
        disabled={loading}
      />
    </div>
  </div>
  <p className="mt-1 text-sm text-slate-500">{prompt.length}/500 characters</p>
</div>
```

**Step 2: Verify the app builds**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 3: Manual smoke test**

Run: `npm run dev`
Verify:
- Microphone button appears at bottom-right of the textarea
- Clicking it prompts for microphone permission
- Recording shows red pulsing button + elapsed time
- Clicking again stops and transcribes
- Transcribed text appends to existing text in the field

**Step 4: Commit**

```bash
git add src/components/weapon-form.tsx
git commit -m "feat: integrate speech-to-text into weapon concept form"
```

---

## Summary

| Task | What | Files | Est. |
|------|------|-------|------|
| 1 | API route `/api/transcribe` | 2 new files (route + test) | 5 min |
| 2 | `useAudioRecorder` hook | 2 new files (hook + test) | 5 min |
| 3 | `MicrophoneButton` component | 1 new file | 3 min |
| 4 | Integrate into `WeaponForm` | 1 modified file | 3 min |

**Dependencies:** Task 4 depends on Tasks 1-3. Tasks 1 and 2 are independent and can be done in parallel. Task 3 depends on Task 2.

**New dev dependency needed:** `@testing-library/react` (for hook tests in Task 2).

**No new env vars needed** — uses existing `OPENAI_API_KEY`.
