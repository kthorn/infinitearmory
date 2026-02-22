# Speech-to-Text Design — Weapon Concept Input

**Date:** 2026-02-22
**Status:** Approved

## Overview

Add a microphone button to the Weapon Concept textarea that lets users speak their weapon idea instead of typing it. Audio is recorded in the browser, sent to the server, transcribed via OpenAI Whisper API, and appended to the textarea.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Scope | Weapon concept field only | Only free-text input where STT adds value |
| STT Engine | OpenAI Whisper API (server-side) | High accuracy, already have OpenAI SDK + API key |
| UX Pattern | Toggle record/stop | Click to start, click to stop. Recording indicator with elapsed time |
| Text Mode | Append | Transcribed text appends after existing text, separated by a space |
| Architecture | Direct Whisper API call | Browser → `/api/transcribe` → OpenAI Whisper → return text |

## Architecture

```
Browser (MediaRecorder API)
  │
  │ POST /api/transcribe (multipart/form-data, audio blob)
  │
  ▼
Next.js API Route (/api/transcribe/route.ts)
  │
  │ openai.audio.transcriptions.create({ model: "whisper-1", file })
  │
  ▼
OpenAI Whisper API
  │
  │ { text: "a flaming greatsword forged in dragon fire" }
  │
  ▼
Browser appends text to textarea
```

## API Route — `/api/transcribe`

**Endpoint:** `POST /api/transcribe`
**Content-Type:** `multipart/form-data`
**Body:** `audio` field containing the recorded audio blob

**Validation:**
- Max file size: 25MB (Whisper API limit)
- MIME type must be audio/* (webm, mp4, wav, ogg, etc.)
- `OPENAI_API_KEY` must be configured

**Response:**
```json
{ "text": "transcribed text here" }
```

**Error responses:**
- 400: Missing or invalid audio file
- 413: File too large
- 500: Whisper API failure

**Implementation:** Uses existing `openai` SDK and `OPENAI_API_KEY` env var. No new dependencies or env vars needed.

## Frontend Components

### `useAudioRecorder` Hook

Custom React hook encapsulating MediaRecorder logic:

```typescript
interface UseAudioRecorderReturn {
  isRecording: boolean
  duration: number        // seconds elapsed
  startRecording: () => Promise<void>
  stopRecording: () => Promise<Blob>
  error: string | null
}
```

- Requests microphone permission via `navigator.mediaDevices.getUserMedia`
- Records audio using `MediaRecorder` API (prefers `audio/webm`, falls back to browser default)
- Tracks elapsed time with a 1-second interval
- Cleans up media streams on unmount

### `MicrophoneButton` Component

A button placed inline next to the Weapon Concept textarea:

**States:**
1. **Idle** — Microphone icon, click to start recording
2. **Recording** — Pulsing red indicator + elapsed time (e.g., "0:05"), click to stop
3. **Transcribing** — Spinner/loading state while waiting for Whisper response
4. **Error** — Brief error message (permission denied, transcription failed)

**Behavior:**
- Click → requests mic permission (first time) → starts recording
- Click again → stops recording → sends audio to `/api/transcribe` → appends result to textarea
- Disabled while the weapon generation form is submitting

### Integration with `WeaponForm`

The `MicrophoneButton` sits inside the textarea's container div, positioned at the bottom-right corner of the textarea as an overlay button. It receives:
- `onTranscription: (text: string) => void` — callback to append text to the prompt state
- `disabled: boolean` — mirrors form loading state

## Browser Compatibility

`MediaRecorder` is supported in all modern browsers (Chrome, Firefox, Safari 14.1+, Edge). Unlike the Web Speech API, there are no browser gaps. The server-side Whisper approach means transcription quality is consistent regardless of browser.

**Graceful degradation:** If `navigator.mediaDevices` is unavailable (e.g., non-HTTPS context, very old browser), the microphone button is hidden entirely.

## Cost

OpenAI Whisper API costs ~$0.006/minute of audio. A typical weapon description recording of 10-15 seconds costs < $0.002. Negligible for this use case.

## Security

- Audio is streamed to the server and forwarded to Whisper — never stored on disk
- Uses existing `OPENAI_API_KEY` server-side — no API key exposure to the client
- Standard Next.js API route — inherits any existing auth middleware
