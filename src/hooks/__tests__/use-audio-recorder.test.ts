// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
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

afterEach(() => {
  vi.useRealTimers()
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
    mockGetUserMedia.mockRejectedValue(new DOMException('Permission denied', 'NotAllowedError'))

    const { result } = renderHook(() => useAudioRecorder())

    await act(async () => {
      await result.current.startRecording()
    })

    expect(result.current.isRecording).toBe(false)
    expect(result.current.error).toMatch(/permission/i)
  })
})
