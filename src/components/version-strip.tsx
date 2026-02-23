'use client'

import { useState } from 'react'
import Image from 'next/image'
import type { WeaponVersion } from '@/lib/schemas'

interface VersionStripProps {
  versions: WeaponVersion[]
  activeVersionId: string | null
  onPromote: (versionId: string) => Promise<void>
  onDelete: (versionId: string) => Promise<void>
}

export function VersionStrip({ versions, activeVersionId, onPromote, onDelete }: VersionStripProps) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null)

  if (versions.length <= 1) return null

  async function handlePromote(versionId: string) {
    setLoadingAction(versionId)
    try {
      await onPromote(versionId)
    } finally {
      setLoadingAction(null)
    }
  }

  async function handleDelete(versionId: string) {
    if (!window.confirm('Delete this version? This cannot be undone.')) return
    setLoadingAction(versionId)
    try {
      await onDelete(versionId)
    } finally {
      setLoadingAction(null)
    }
  }

  return (
    <div className="border-t border-slate-700 bg-slate-800/30">
      <div className="px-4 py-2">
        <p className="text-xs text-slate-500 mb-2">Versions ({versions.length})</p>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {versions.map((version) => {
            const isActive = version.id === activeVersionId
            return (
              <div
                key={version.id}
                className={`flex-shrink-0 w-20 rounded border ${
                  isActive
                    ? 'border-indigo-500 ring-1 ring-indigo-500/50'
                    : 'border-slate-700 hover:border-slate-500'
                } overflow-hidden group relative`}
              >
                {/* Thumbnail */}
                <div className="relative aspect-square bg-slate-900">
                  {version.imageUrl ? (
                    <Image
                      src={version.imageUrl}
                      alt={`Version ${version.versionNumber}`}
                      fill
                      className="object-contain"
                      sizes="80px"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-600 text-xs">
                      No img
                    </div>
                  )}
                </div>

                {/* Version info */}
                <div className="px-1 py-0.5 text-center">
                  <span className="text-xs text-slate-400">v{version.versionNumber}</span>
                  {isActive && (
                    <span className="ml-1 text-xs text-indigo-400">✓</span>
                  )}
                </div>

                {/* Hover actions (non-active versions only) */}
                {!isActive && (
                  <div className="absolute inset-0 bg-slate-900/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                    <button
                      type="button"
                      onClick={() => handlePromote(version.id)}
                      disabled={loadingAction !== null}
                      className="text-xs text-indigo-400 hover:text-indigo-300 px-2 py-0.5 rounded bg-slate-800"
                    >
                      Use
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(version.id)}
                      disabled={loadingAction !== null}
                      className="text-xs text-red-400 hover:text-red-300 px-2 py-0.5 rounded bg-slate-800"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
