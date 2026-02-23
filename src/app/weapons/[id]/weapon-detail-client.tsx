'use client'

import { useRouter } from 'next/navigation'
import { WeaponCard, GenerationProgress, Button } from '@/components'
import { useWeaponPolling } from '@/hooks'
import type { WeaponResponse } from '@/lib/schemas'

interface WeaponDetailClientProps {
  initialWeapon: WeaponResponse
}

export function WeaponDetailClient({ initialWeapon }: WeaponDetailClientProps) {
  const router = useRouter()
  const { weapon, error: pollingError, refetch } = useWeaponPolling({ initialWeapon })

  const isGenerating = weapon.status !== 'done' && weapon.status !== 'error'

  async function handleRegenerateImage() {
    const response = await fetch(`/api/weapons/${weapon.id}/regenerate-image`, { method: 'POST' })
    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      throw new Error(data.error || 'Failed to regenerate image')
    }
    await refetch()
  }

  async function handleRerollStats() {
    const response = await fetch(`/api/weapons/${weapon.id}/reroll-stats`, { method: 'POST' })
    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      throw new Error(data.error || 'Failed to reroll stats')
    }
    router.refresh()
  }

  async function handleDelete() {
    const response = await fetch(`/api/weapons/${weapon.id}`, { method: 'DELETE' })
    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      throw new Error(data.error || 'Failed to delete weapon')
    }
    router.push('/weapons')
  }

  if (isGenerating) {
    return (
      <div>
        <GenerationProgress status={weapon.status} />
        {pollingError && (
          <p className="text-center text-sm text-red-400 mt-4">
            Having trouble checking status. Retrying...
          </p>
        )}
      </div>
    )
  }

  if (weapon.status === 'error') {
    const retryUrl = `/?prompt=${encodeURIComponent(weapon.userPrompt)}`
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-red-400 mb-4">Generation Failed</h2>
        <p className="text-slate-400 mb-6">Something went wrong during generation. Please try again.</p>
        <Button onClick={() => router.push(retryUrl)}>
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <WeaponCard
      weapon={weapon}
      onRegenerateImage={handleRegenerateImage}
      onRerollStats={handleRerollStats}
      onDelete={handleDelete}
    />
  )
}
