'use client'

import { useState } from 'react'
import Image from 'next/image'
import ReactMarkdown from 'react-markdown'
import { Button, Card, CardContent, CardFooter } from './ui'
import { StatBlock } from './stat-block'
import type { WeaponResponse } from '@/lib/schemas'
import { CATEGORY_DISPLAY } from '@/lib/schemas'

interface WeaponCardProps {
  weapon: WeaponResponse
  onRegenerateImage?: () => Promise<void>
  onRerollStats?: () => Promise<void>
}

export function WeaponCard({ weapon, onRegenerateImage, onRerollStats }: WeaponCardProps) {
  const [regeneratingImage, setRegeneratingImage] = useState(false)
  const [rerollingStats, setRerollingStats] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'stats' | 'lore'>('stats')

  async function handleRegenerateImage() {
    if (!onRegenerateImage) return
    setRegeneratingImage(true)
    setActionError(null)
    try {
      await onRegenerateImage()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to regenerate image')
    } finally {
      setRegeneratingImage(false)
    }
  }

  async function handleRerollStats() {
    if (!onRerollStats) return
    setRerollingStats(true)
    setActionError(null)
    try {
      await onRerollStats()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to reroll stats')
    } finally {
      setRerollingStats(false)
    }
  }

  if (!weapon.weaponSpec) {
    return (
      <Card className="max-w-4xl mx-auto">
        <CardContent>
          <div className="text-center py-12">
            <p className="text-slate-400">Weapon data is not available.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="max-w-4xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
        {/* Image Section */}
        <div className="relative aspect-square bg-slate-900">
          {weapon.imageUrl ? (
            <Image
              src={weapon.imageUrl}
              alt={weapon.weaponSpec.name}
              fill
              className="object-contain"
              priority
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-slate-600">
              No image
            </div>
          )}
          {/* Category badge */}
          {weapon.weaponSpec.category && weapon.weaponSpec.category !== 'fantasy_weapon' && (
            <span className="absolute top-2 left-2 px-2 py-1 bg-slate-900/80 text-xs font-medium text-indigo-300 rounded border border-indigo-500/30">
              {CATEGORY_DISPLAY[weapon.weaponSpec.category]}
            </span>
          )}
        </div>

        {/* Content Section */}
        <div className="flex flex-col">
          {/* Tabs */}
          <div className="flex border-b border-slate-700">
            <button
              type="button"
              aria-pressed={activeTab === 'stats'}
              onClick={() => setActiveTab('stats')}
              className={`flex-1 px-4 py-3 text-sm font-medium ${
                activeTab === 'stats'
                  ? 'text-indigo-400 border-b-2 border-indigo-400'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Stats
            </button>
            <button
              type="button"
              aria-pressed={activeTab === 'lore'}
              onClick={() => setActiveTab('lore')}
              className={`flex-1 px-4 py-3 text-sm font-medium ${
                activeTab === 'lore'
                  ? 'text-indigo-400 border-b-2 border-indigo-400'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Lore
            </button>
          </div>

          {/* Tab Content */}
          <CardContent className="flex-1 overflow-y-auto max-h-[400px]">
            {activeTab === 'stats' ? (
              <StatBlock spec={weapon.weaponSpec} />
            ) : (
              <div className="prose prose-invert prose-sm max-w-none">
                <ReactMarkdown>{weapon.descriptionMd ?? ''}</ReactMarkdown>
              </div>
            )}
          </CardContent>

          {/* Action Error */}
          {actionError && (
            <div role="alert" className="px-6 py-2 bg-red-900/50 border-t border-red-700 text-red-300 text-sm">
              {actionError}
            </div>
          )}

          {/* Actions */}
          {(onRegenerateImage || onRerollStats) && (
            <CardFooter className="flex gap-3">
              {onRegenerateImage && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleRegenerateImage}
                  loading={regeneratingImage}
                  disabled={rerollingStats}
                >
                  New Image
                </Button>
              )}
              {onRerollStats && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleRerollStats}
                  loading={rerollingStats}
                  disabled={regeneratingImage}
                >
                  Reroll Stats
                </Button>
              )}
            </CardFooter>
          )}
        </div>
      </div>
    </Card>
  )
}
