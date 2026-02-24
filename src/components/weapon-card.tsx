'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import ReactMarkdown from 'react-markdown'
import { Button, Card, CardContent, CardFooter } from './ui'
import { StatBlock } from './stat-block'
import { VersionStrip } from './version-strip'
import type { WeaponResponse, WeaponVersion } from '@/lib/schemas'
import { CATEGORY_DISPLAY, STYLE_DISPLAY } from '@/lib/schemas'
import { getModelLabel } from '@/lib/models'

interface WeaponCardProps {
  weapon: WeaponResponse
  versions?: WeaponVersion[]
  onRegenerateImage?: (guidance?: string) => Promise<void>
  onRerollStats?: (guidance?: string) => Promise<void>
  onDelete?: () => Promise<void>
  onPromoteVersion?: (versionId: string) => Promise<void>
  onDeleteVersion?: (versionId: string) => Promise<void>
}

export function WeaponCard({
  weapon,
  versions = [],
  onRegenerateImage,
  onRerollStats,
  onDelete,
  onPromoteVersion,
  onDeleteVersion,
}: WeaponCardProps) {
  const router = useRouter()
  const [regeneratingImage, setRegeneratingImage] = useState(false)
  const [rerollingStats, setRerollingStats] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'stats' | 'lore'>('stats')
  const [imageGuidance, setImageGuidance] = useState('')
  const [statsGuidance, setStatsGuidance] = useState('')

  async function handleRegenerateImage() {
    if (!onRegenerateImage) return
    setRegeneratingImage(true)
    setActionError(null)
    try {
      const guidance = imageGuidance.trim() || undefined
      await onRegenerateImage(guidance)
      setImageGuidance('')
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
      const guidance = statsGuidance.trim() || undefined
      await onRerollStats(guidance)
      setStatsGuidance('')
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to reroll stats')
    } finally {
      setRerollingStats(false)
    }
  }

  async function handleDelete() {
    if (!onDelete) return
    if (!window.confirm('Delete this weapon? This cannot be undone.')) return
    setDeleting(true)
    setActionError(null)
    try {
      await onDelete()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete weapon')
    } finally {
      setDeleting(false)
    }
  }

  function handleDownloadJson() {
    const data = {
      id: weapon.id,
      createdAt: weapon.createdAt,
      userPrompt: weapon.userPrompt,
      options: weapon.options,
      textModel: weapon.textModel,
      imageModel: weapon.imageModel,
      weaponSpec: weapon.weaponSpec,
      descriptionMd: weapon.descriptionMd,
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const safeName = (weapon.weaponSpec?.name ?? weapon.id).replace(/[^a-zA-Z0-9_-]/g, '_')
    a.download = `${safeName}.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 100)
  }

  function handleRemix() {
    const params = new URLSearchParams()
    params.set('prompt', weapon.userPrompt)
    if (weapon.options?.category) params.set('category', String(weapon.options.category))
    if (weapon.options?.style) params.set('style', String(weapon.options.style))
    if (weapon.options?.rarity) params.set('rarity', String(weapon.options.rarity))
    // Use top-level model fields (canonical, set by orchestrator) over options (user input)
    const textModelId = weapon.textModel ?? (weapon.options?.textModel ? String(weapon.options.textModel) : null)
    const imageModelId = weapon.imageModel ?? (weapon.options?.imageModel ? String(weapon.options.imageModel) : null)
    if (textModelId) params.set('textModel', textModelId)
    if (imageModelId) params.set('imageModel', imageModelId)
    router.push(`/?${params.toString()}`)
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
          {(onRegenerateImage || onRerollStats || onDelete) && (
            <CardFooter className="flex flex-col gap-3">
              {/* Image refinement */}
              {onRegenerateImage && (
                <div className="flex gap-2 w-full">
                  <input
                    type="text"
                    value={imageGuidance}
                    onChange={(e) => setImageGuidance(e.target.value)}
                    placeholder="Describe visual changes (leave blank for a fresh image)"
                    aria-label="Image refinement guidance"
                    maxLength={1000}
                    disabled={regeneratingImage || rerollingStats}
                    className="flex-1 px-3 py-1.5 text-sm bg-slate-800 border border-slate-700 rounded text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    onKeyDown={(e) => { if (e.key === 'Enter') handleRegenerateImage() }}
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleRegenerateImage}
                    loading={regeneratingImage}
                    disabled={rerollingStats}
                  >
                    {imageGuidance.trim() ? 'Refine Image' : 'New Image'}
                  </Button>
                </div>
              )}
              {/* Stats refinement */}
              {onRerollStats && (
                <div className="flex gap-2 w-full">
                  <input
                    type="text"
                    value={statsGuidance}
                    onChange={(e) => setStatsGuidance(e.target.value)}
                    placeholder="Describe changes (leave blank to reroll from scratch)"
                    aria-label="Stats refinement guidance"
                    maxLength={1000}
                    disabled={regeneratingImage || rerollingStats}
                    className="flex-1 px-3 py-1.5 text-sm bg-slate-800 border border-slate-700 rounded text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    onKeyDown={(e) => { if (e.key === 'Enter') handleRerollStats() }}
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleRerollStats}
                    loading={rerollingStats}
                    disabled={regeneratingImage}
                  >
                    {statsGuidance.trim() ? 'Refine Stats' : 'Reroll Stats'}
                  </Button>
                </div>
              )}
              {/* Utility actions row */}
              <div className="flex gap-3 w-full">
                <Button variant="secondary" size="sm" onClick={handleDownloadJson}>
                  Download JSON
                </Button>
                <Button variant="secondary" size="sm" onClick={handleRemix}>
                  Remix
                </Button>
                {onDelete && (
                  <>
                    <div className="flex-1" />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDelete}
                      loading={deleting}
                      disabled={regeneratingImage || rerollingStats}
                      className="text-red-400 hover:text-red-300 hover:bg-red-900/30"
                    >
                      Delete
                    </Button>
                  </>
                )}
              </div>
            </CardFooter>
          )}
        </div>
      </div>
      {/* Generation metadata */}
      <div className="px-4 py-2 bg-slate-800/50 border-b border-slate-700 space-y-1">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
          {weapon.textModel && (
            <span title="Text model">
              <span className="text-slate-500">Text:</span> {getModelLabel(weapon.textModel)}
            </span>
          )}
          {weapon.imageModel && (
            <span title="Image model">
              <span className="text-slate-500">Image:</span> {getModelLabel(weapon.imageModel)}
            </span>
          )}
          {typeof weapon.options?.style === 'string' && (
            <span title="Art style">
              <span className="text-slate-500">Style:</span> {STYLE_DISPLAY[weapon.options.style as keyof typeof STYLE_DISPLAY] ?? weapon.options.style}
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 italic">&ldquo;{weapon.userPrompt}&rdquo;</p>
      </div>
      {/* Version history */}
      {versions.length > 1 && onPromoteVersion && onDeleteVersion && (
        <VersionStrip
          versions={versions}
          activeVersionId={weapon.activeVersionId ?? null}
          onPromote={onPromoteVersion}
          onDelete={onDeleteVersion}
        />
      )}
    </Card>
  )
}
