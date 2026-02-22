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
        <WeaponListItem key={weapon.id} weapon={weapon} />
      ))}
    </div>
  )
}

function WeaponListItem({ weapon }: { weapon: WeaponSummary }) {
  const isLoading = weapon.status !== 'done' && weapon.status !== 'error'
  const rarityColor = weapon.rarity ? RARITY_COLORS[weapon.rarity as Rarity] : 'text-slate-400'

  return (
    <Link href={`/weapons/${weapon.id}`}>
      <Card className="hover:border-indigo-500 transition-colors cursor-pointer h-full">
        {/* Image */}
        <div className="relative aspect-square bg-slate-900">
          {weapon.imageUrl ? (
            <Image
              src={weapon.imageUrl}
              alt={weapon.name ?? 'Weapon'}
              fill
              className="object-cover"
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
