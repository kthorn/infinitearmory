'use client'

import { Spinner } from './ui'
import type { WeaponStatus } from '@/types'

interface GenerationProgressProps {
  status: WeaponStatus
}

const statusMessages: Record<WeaponStatus, string> = {
  queued: 'Waiting to start...',
  generating_text: 'Crafting weapon description and stats...',
  generating_image: 'Generating weapon artwork...',
  done: 'Complete!',
  error: 'Generation failed',
}

const statusProgress: Record<WeaponStatus, number> = {
  queued: 10,
  generating_text: 40,
  generating_image: 75,
  done: 100,
  error: 0,
}

export function GenerationProgress({ status }: GenerationProgressProps) {
  const isLoading = status !== 'done' && status !== 'error'
  const progress = statusProgress[status]

  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-6">
      {isLoading && <Spinner size="lg" />}

      <div className="text-center">
        <p className="text-xl font-medium text-white">{statusMessages[status]}</p>
        {isLoading && (
          <p className="text-sm text-slate-400 mt-2">This may take up to a minute</p>
        )}
      </div>

      {isLoading && (
        <div className="w-full max-w-xs">
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
