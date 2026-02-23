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
      // Clean up any acquired stream on failure
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null

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
