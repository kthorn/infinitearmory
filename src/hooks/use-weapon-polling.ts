'use client'

import { useState, useEffect, useCallback } from 'react'
import type { WeaponResponse } from '@/lib/schemas'

const STALE_GENERATION_MS = 3 * 60 * 1000 // 3 minutes

interface UseWeaponPollingOptions {
  initialWeapon: WeaponResponse
  pollInterval?: number
}

interface UseWeaponPollingResult {
  weapon: WeaponResponse
  isPolling: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useWeaponPolling({
  initialWeapon,
  pollInterval = 2000,
}: UseWeaponPollingOptions): UseWeaponPollingResult {
  const [weapon, setWeapon] = useState<WeaponResponse>(initialWeapon)
  const [isPolling, setIsPolling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Sync state when initialWeapon changes (e.g., navigating to a different weapon, or after reroll/router.refresh)
  useEffect(() => {
    setWeapon(initialWeapon)
  }, [initialWeapon.id, initialWeapon.updatedAt])

  const shouldPoll = weapon.status !== 'done' && weapon.status !== 'error'

  const fetchWeapon = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch(`/api/weapons/${weapon.id}`, { cache: 'no-store', signal })
      if (response.status === 404) {
        // Weapon was deleted (generation failed) — stop polling and mark as error
        if (!signal?.aborted) {
          setWeapon(prev => ({ ...prev, status: 'error' as const }))
          setError('Generation failed')
        }
        return
      }
      if (!response.ok) {
        throw new Error('Failed to fetch weapon')
      }
      const data = await response.json()
      if (!signal?.aborted) {
        // Detect stuck generations: if status is generating but updatedAt is stale, treat as error
        const isGenerating = data.status !== 'done' && data.status !== 'error'
        if (isGenerating && data.updatedAt) {
          const staleMs = Date.now() - new Date(data.updatedAt).getTime()
          if (staleMs > STALE_GENERATION_MS) {
            setWeapon({ ...data, status: 'error' as const })
            setError('Generation appears to have stalled. Please try again.')
            return
          }
        }
        setWeapon(data)
        setError(null)
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      if (!signal?.aborted) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      }
    }
  }, [weapon.id])

  useEffect(() => {
    if (!shouldPoll) {
      setIsPolling(false)
      return
    }

    setIsPolling(true)
    const controller = new AbortController()
    let timeoutId: ReturnType<typeof setTimeout> | undefined

    // Use recursive setTimeout to avoid overlapping requests
    async function poll() {
      await fetchWeapon(controller.signal)
      if (!controller.signal.aborted) {
        timeoutId = setTimeout(poll, pollInterval)
      }
    }

    poll()

    return () => {
      controller.abort()
      if (timeoutId) clearTimeout(timeoutId)
      setIsPolling(false)
    }
  }, [shouldPoll, fetchWeapon, pollInterval])

  return {
    weapon,
    isPolling,
    error,
    refetch: fetchWeapon,
  }
}
