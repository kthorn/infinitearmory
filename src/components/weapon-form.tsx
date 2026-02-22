'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Select, Card, CardContent, CardFooter } from './ui'
import { RULESET_DISPLAY, STYLE_DISPLAY, RARITY_DISPLAY } from '@/lib/schemas'

const rulesetOptions = Object.entries(RULESET_DISPLAY).map(([value, label]) => ({ value, label }))
const styleOptions = Object.entries(STYLE_DISPLAY).map(([value, label]) => ({ value, label }))
const rarityOptions = [
  { value: '', label: 'Auto (LLM chooses)' },
  ...Object.entries(RARITY_DISPLAY).map(([value, label]) => ({ value, label })),
]

export function WeaponForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [prompt, setPrompt] = useState('')
  const [ruleset, setRuleset] = useState('dnd5e')
  const [style, setStyle] = useState('fantasy_art')
  const [rarity, setRarity] = useState('')

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
            ruleset,
            style,
            ...(rarity && { rarity }),
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

  return (
    <Card className="max-w-2xl mx-auto">
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div>
            <label htmlFor="weapon-prompt" className="block text-sm font-medium text-slate-300 mb-1">Weapon Concept</label>
            <textarea
              id="weapon-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe your weapon idea... (e.g., 'A sword made of crystallized starlight, wielded by an ancient elven queen')"
              className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent min-h-[100px] resize-y"
              required
              minLength={3}
              maxLength={500}
            />
            <p className="mt-1 text-sm text-slate-500">{prompt.length}/500 characters</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select
              label="Ruleset"
              options={rulesetOptions}
              value={ruleset}
              onChange={(e) => setRuleset(e.target.value)}
            />
            <Select
              label="Art Style"
              options={styleOptions}
              value={style}
              onChange={(e) => setStyle(e.target.value)}
            />
            <Select
              label="Rarity"
              options={rarityOptions}
              value={rarity}
              onChange={(e) => setRarity(e.target.value)}
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
            {loading ? 'Creating...' : 'Generate Weapon'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
