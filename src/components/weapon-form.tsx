'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button, Select, GroupedSelect, Card, CardContent, CardFooter } from './ui'
import { MicrophoneButton } from './microphone-button'
import {
  CATEGORY_DISPLAY,
  STYLE_DISPLAY,
  RARITY_DISPLAY,
  CATEGORY_STYLES,
  CATEGORY_RULESET,
  CATEGORY_DEFAULT_STYLE,
  categorySchema,
} from '@/lib/schemas'
import type { Category, Style } from '@/lib/schemas'
import { TEXT_MODELS, IMAGE_MODELS, PROVIDER_DISPLAY, getDefaultTextModel, getDefaultImageModel, getAllTextModels, getAllImageModels } from '@/lib/models'

const categoryOptions = Object.entries(CATEGORY_DISPLAY).map(([value, label]) => ({ value, label }))
const rarityOptions = [
  { value: '', label: 'Auto (LLM chooses)' },
  ...Object.entries(RARITY_DISPLAY).map(([value, label]) => ({ value, label })),
]

const textModelGroups = Object.entries(TEXT_MODELS).map(([provider, models]) => ({
  label: PROVIDER_DISPLAY[provider] ?? provider,
  options: models.map((m) => ({ value: m.id, label: m.label })),
}))

const imageModelGroups = Object.entries(IMAGE_MODELS).map(([provider, models]) => ({
  label: PROVIDER_DISPLAY[provider] ?? provider,
  options: models.map((m) => ({ value: m.id, label: m.label })),
}))

function getStyleOptions(category: Category) {
  const styles = CATEGORY_STYLES[category]
  return styles.map((value) => ({ value, label: STYLE_DISPLAY[value] }))
}

export function WeaponForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [prompt, setPrompt] = useState(searchParams.get('prompt') ?? '')

  // Validate category param against schema to avoid runtime crash in CATEGORY_STYLES lookup
  const categoryParam = searchParams.get('category')
  const validCategory = categoryParam && categorySchema.safeParse(categoryParam).success
    ? (categoryParam as Category)
    : 'fantasy_weapon'
  const [category, setCategory] = useState<Category>(validCategory)

  const initialStyle = searchParams.get('style') as Style | null
  const [style, setStyle] = useState<Style>(
    initialStyle && CATEGORY_STYLES[validCategory]?.includes(initialStyle)
      ? initialStyle
      : CATEGORY_DEFAULT_STYLE[validCategory] ?? 'fantasy_art'
  )
  const [rarity, setRarity] = useState(searchParams.get('rarity') ?? '')

  // Validate model params against known model IDs
  const validTextModelIds = getAllTextModels().map((m) => m.id)
  const validImageModelIds = getAllImageModels().map((m) => m.id)
  const textModelParam = searchParams.get('textModel')
  const imageModelParam = searchParams.get('imageModel')
  const [textModel, setTextModel] = useState(
    textModelParam && validTextModelIds.includes(textModelParam) ? textModelParam : getDefaultTextModel()
  )
  const [imageModel, setImageModel] = useState(
    imageModelParam && validImageModelIds.includes(imageModelParam) ? imageModelParam : getDefaultImageModel()
  )

  function handleCategoryChange(newCategory: Category) {
    setCategory(newCategory)
    // Reset style to the default for the new category if current style isn't available
    const availableStyles = CATEGORY_STYLES[newCategory]
    if (!availableStyles.includes(style)) {
      setStyle(CATEGORY_DEFAULT_STYLE[newCategory])
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const response = await fetch('/api/weapons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          options: {
            category,
            ruleset: CATEGORY_RULESET[category],
            style,
            ...(rarity && { rarity }),
            textModel,
            imageModel,
          },
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error || 'Failed to create weapon')
      }

      const weapon = await response.json()
      router.push(`/weapons/${weapon.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const placeholders: Record<Category, string> = {
    fantasy_weapon: "Describe your weapon idea... (e.g., 'A sword made of crystallized starlight, wielded by an ancient elven queen')",
    scifi_handheld: "Describe your weapon idea... (e.g., 'A plasma pistol that overcharges for devastating shots, used by bounty hunters')",
    scifi_turret: "Describe your turret idea... (e.g., 'An orbital defense laser that tracks incoming ships with AI targeting')",
    mech: "Describe your mech idea... (e.g., 'A heavy assault mech built for urban warfare with dual autocannons')",
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div>
            <label htmlFor="weapon-prompt" className="block text-sm font-medium text-slate-300 mb-1">Concept</label>
            <div className="relative">
              <textarea
                id="weapon-prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={placeholders[category]}
                className="w-full px-4 py-3 pb-10 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent min-h-[100px] resize-y"
                required
                minLength={3}
                maxLength={2000}
              />
              <div className="absolute bottom-2 right-2">
                <MicrophoneButton
                  onTranscription={(text) => {
                    setPrompt((prev) => {
                      const combined = prev ? `${prev} ${text}` : text
                      return combined.slice(0, 2000)
                    })
                  }}
                  disabled={loading}
                />
              </div>
            </div>
            <p className="mt-1 text-sm text-slate-500">{prompt.length}/2000 characters</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select
              label="Category"
              options={categoryOptions}
              value={category}
              onChange={(e) => handleCategoryChange(e.target.value as Category)}
            />
            <Select
              label="Art Style"
              options={getStyleOptions(category)}
              value={style}
              onChange={(e) => setStyle(e.target.value as Style)}
            />
            <Select
              label="Rarity"
              options={rarityOptions}
              value={rarity}
              onChange={(e) => setRarity(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <GroupedSelect
              label="Text Model"
              groups={textModelGroups}
              value={textModel}
              onChange={(e) => setTextModel(e.target.value)}
            />
            <GroupedSelect
              label="Image Model"
              groups={imageModelGroups}
              value={imageModel}
              onChange={(e) => setImageModel(e.target.value)}
            />
          </div>

          {error && (
            <div role="alert" className="p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300">
              {error}
            </div>
          )}
        </CardContent>

        <CardFooter>
          <Button type="submit" loading={loading} disabled={!prompt.trim()} className="w-full">
            {loading ? 'Creating...' : `Generate ${CATEGORY_DISPLAY[category]}`}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
