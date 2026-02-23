'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Card } from './ui'
import { RARITY_COLORS } from '@/lib/schemas'
import type { WeaponSummary } from '@/lib/schemas'
import type { Rarity } from '@/lib/schemas'

interface WeaponListProps {
  weapons: WeaponSummary[]
}

export function WeaponList({ weapons }: WeaponListProps) {
  const router = useRouter()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleDelete(e: React.MouseEvent, weaponId: string) {
    e.preventDefault()
    e.stopPropagation()
    if (!window.confirm('Delete this weapon? This cannot be undone.')) return
    setDeletingId(weaponId)
    try {
      const response = await fetch(`/api/weapons/${weaponId}`, { method: 'DELETE' })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        alert(data.error || 'Failed to delete weapon')
        return
      }
      router.refresh()
    } finally {
      setDeletingId(null)
    }
  }

  if (weapons.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400">No weapons yet. Create your first one!</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {weapons.map((weapon) => (
        <WeaponListItem
          key={weapon.id}
          weapon={weapon}
          deleting={deletingId === weapon.id}
          onDelete={handleDelete}
        />
      ))}
    </div>
  )
}

function WeaponListItem({
  weapon,
  deleting,
  onDelete,
}: {
  weapon: WeaponSummary
  deleting: boolean
  onDelete: (e: React.MouseEvent, id: string) => void
}) {
  const isLoading = weapon.status !== 'done' && weapon.status !== 'error'
  const rarityColor = weapon.rarity ? RARITY_COLORS[weapon.rarity as Rarity] : 'text-slate-400'

  return (
    <Link href={`/weapons/${weapon.id}`}>
      <Card className={`hover:border-indigo-500 transition-colors cursor-pointer h-full group relative ${deleting ? 'opacity-50' : ''}`}>
        {/* Delete button */}
        <button
          type="button"
          onClick={(e) => onDelete(e, weapon.id)}
          disabled={deleting}
          className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-slate-900/80 text-slate-400 hover:text-red-400 hover:bg-red-900/50 opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="Delete weapon"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
          </svg>
        </button>

        {/* Image */}
        <div className="relative aspect-square bg-slate-900">
          {weapon.imageUrl ? (
            <Image
              src={weapon.imageUrl}
              alt={weapon.name ?? 'Weapon'}
              fill
              className="object-contain"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              {isLoading ? (
                <div className="text-slate-500 text-sm">Generating...</div>
              ) : weapon.status === 'error' ? (
                <div className="text-red-500 text-sm">Failed</div>
              ) : (
                <div className="text-slate-600 text-sm">No image</div>
              )}
            </div>
          )}

          {/* Status badge */}
          {isLoading && (
            <div className="absolute top-2 right-2 px-2 py-1 bg-indigo-600 text-white text-xs rounded-full">
              {weapon.status.replaceAll('_', ' ')}
            </div>
          )}
          {weapon.status === 'error' && (
            <div className="absolute top-2 right-2 px-2 py-1 bg-red-600 text-white text-xs rounded-full">
              Error
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-4">
          <h3 className="font-semibold text-white truncate">
            {weapon.name ?? 'Generating...'}
          </h3>
          {weapon.rarity && (
            <p className={`text-sm ${rarityColor} capitalize`}>
              {weapon.rarity.replaceAll('_', ' ')}
            </p>
          )}
          <p className="text-xs text-slate-500 mt-2 line-clamp-2">{weapon.userPrompt}</p>
        </div>
      </Card>
    </Link>
  )
}
