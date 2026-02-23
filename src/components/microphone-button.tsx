'use client'

import { useState, useEffect } from 'react'
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
  const [supported, setSupported] = useState(false)

  useEffect(() => {
    setSupported(
      typeof window !== 'undefined' &&
      !!navigator.mediaDevices?.getUserMedia &&
      typeof MediaRecorder !== 'undefined'
    )
  }, [])

  if (!supported) return null

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
