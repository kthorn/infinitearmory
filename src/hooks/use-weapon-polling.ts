'use client'

import { useState, useEffect, useCallback } from 'react'
import type { WeaponResponse } from '@/lib/schemas'

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
      if (!response.ok) {
        throw new Error('Failed to fetch weapon')
      }
      const data = await response.json()
      if (!signal?.aborted) {
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
