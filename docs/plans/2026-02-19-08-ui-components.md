# Component 8: UI Components Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build React components for the weapon generator UI including form, progress display, weapon cards, and history.

**Architecture:** React Server Components by default, Client Components where needed (forms, polling). Tailwind CSS for styling. Custom hooks for data fetching and polling.

**Tech Stack:** Next.js App Router, React, Tailwind CSS

---

## Task 1: Create Base UI Components

**Files:**
- Create: `src/components/ui/button.tsx`
- Create: `src/components/ui/input.tsx`
- Create: `src/components/ui/select.tsx`
- Create: `src/components/ui/card.tsx`
- Create: `src/components/ui/spinner.tsx`

**Step 1: Create Button component**

Create file `src/components/ui/button.tsx`:

```typescript
import { forwardRef, type ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed'

    const variants = {
      primary: 'bg-indigo-600 hover:bg-indigo-700 text-white focus:ring-indigo-500',
      secondary: 'bg-slate-700 hover:bg-slate-600 text-white focus:ring-slate-500',
      ghost: 'bg-transparent hover:bg-slate-800 text-slate-300 focus:ring-slate-500',
    }

    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg',
    }

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Spinner className="mr-2 h-4 w-4" />}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

function Spinner({ className = '' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}
```

**Step 2: Create Input component**

Create file `src/components/ui/input.tsx`:

```typescript
import { forwardRef, type InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-slate-300 mb-1">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${error ? 'border-red-500' : ''} ${className}`}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'
```

**Step 3: Create Select component**

Create file `src/components/ui/select.tsx`:

```typescript
import { forwardRef, type SelectHTMLAttributes } from 'react'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  options: SelectOption[]
  error?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = '', label, options, error, id, ...props }, ref) => {
    const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={selectId} className="block text-sm font-medium text-slate-300 mb-1">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={`w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${error ? 'border-red-500' : ''} ${className}`}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && <p className="mt-1 text-sm text-red-400">{error}</p>}
      </div>
    )
  }
)

Select.displayName = 'Select'
```

**Step 4: Create Card component**

Create file `src/components/ui/card.tsx`:

```typescript
import type { HTMLAttributes, ReactNode } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export function Card({ className = '', children, ...props }: CardProps) {
  return (
    <div
      className={`bg-slate-800 border border-slate-700 rounded-lg overflow-hidden ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ className = '', children, ...props }: CardProps) {
  return (
    <div className={`px-6 py-4 border-b border-slate-700 ${className}`} {...props}>
      {children}
    </div>
  )
}

export function CardContent({ className = '', children, ...props }: CardProps) {
  return (
    <div className={`px-6 py-4 ${className}`} {...props}>
      {children}
    </div>
  )
}

export function CardFooter({ className = '', children, ...props }: CardProps) {
  return (
    <div className={`px-6 py-4 border-t border-slate-700 bg-slate-800/50 ${className}`} {...props}>
      {children}
    </div>
  )
}
```

**Step 5: Create Spinner component**

Create file `src/components/ui/spinner.tsx`:

```typescript
interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizes = {
  sm: 'h-4 w-4',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
}

export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  return (
    <svg
      className={`animate-spin text-indigo-500 ${sizes[size]} ${className}`}
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}
```

**Step 6: Create UI index**

Create file `src/components/ui/index.ts`:

```typescript
export { Button } from './button'
export { Input } from './input'
export { Select } from './select'
export { Card, CardHeader, CardContent, CardFooter } from './card'
export { Spinner } from './spinner'
```

**Step 7: Remove .gitkeep files**

Run:
```bash
rm -f src/components/.gitkeep src/components/ui/.gitkeep
```

**Step 8: Verify compilation**

Run:
```bash
npx tsc --noEmit
```

Expected: No errors.

**Step 9: Commit**

Run:
```bash
git add src/components/ui && git commit -m "feat: add base UI components"
```

---

## Task 2: Create Weapon Form Component

**Files:**
- Create: `src/components/weapon-form.tsx`

**Step 1: Create weapon form**

Create file `src/components/weapon-form.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Input, Select, Card, CardContent, CardFooter } from './ui'
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
        const data = await response.json()
        throw new Error(data.error || 'Failed to create weapon')
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
            <label className="block text-sm font-medium text-slate-300 mb-1">Weapon Concept</label>
            <textarea
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
            <div className="p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300">
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
```

**Step 2: Verify compilation**

Run:
```bash
npx tsc --noEmit
```

Expected: No errors.

**Step 3: Commit**

Run:
```bash
git add src/components/weapon-form.tsx && git commit -m "feat: add weapon form component"
```

---

## Task 3: Create Generation Progress Component

**Files:**
- Create: `src/components/generation-progress.tsx`

**Step 1: Create progress component**

Create file `src/components/generation-progress.tsx`:

```typescript
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
```

**Step 2: Verify compilation**

Run:
```bash
npx tsc --noEmit
```

Expected: No errors.

**Step 3: Commit**

Run:
```bash
git add src/components/generation-progress.tsx && git commit -m "feat: add generation progress component"
```

---

## Task 4: Create Stat Block Component

**Files:**
- Create: `src/components/stat-block.tsx`

**Step 1: Create stat block component**

Create file `src/components/stat-block.tsx`:

```typescript
import { RARITY_COLORS, TRIGGER_DISPLAY } from '@/lib/schemas'
import type { WeaponSpec } from '@/lib/schemas'

interface StatBlockProps {
  spec: WeaponSpec
}

export function StatBlock({ spec }: StatBlockProps) {
  const rarityColor = RARITY_COLORS[spec.rarity]

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 font-serif">
      {/* Header */}
      <div className="border-b border-amber-700/50 pb-3 mb-4">
        <h2 className="text-2xl font-bold text-amber-100">{spec.name}</h2>
        <p className="text-sm italic text-slate-400">
          <span className={rarityColor}>{spec.rarity.replace('_', ' ')}</span>
          {' '}{spec.weaponType}
          {spec.properties.length > 0 && (
            <span className="text-slate-500">
              {' '}({spec.properties.join(', ')})
            </span>
          )}
        </p>
      </div>

      {/* Damage */}
      <div className="mb-4">
        <p className="text-slate-300">
          <span className="font-semibold">Damage:</span>{' '}
          {spec.damage.dice} {spec.damage.type}
          {spec.damageBonus ? ` + ${spec.damageBonus}` : ''}
        </p>
        {spec.toHitBonus !== undefined && (
          <p className="text-slate-300">
            <span className="font-semibold">Attack Bonus:</span> +{spec.toHitBonus}
          </p>
        )}
      </div>

      {/* Charges */}
      {spec.charges && (
        <div className="mb-4 p-3 bg-slate-800 rounded">
          <p className="text-slate-300">
            <span className="font-semibold">Charges:</span>{' '}
            {spec.charges.current}/{spec.charges.max}
            <span className="text-slate-500"> (recharges {spec.charges.recharge})</span>
          </p>
        </div>
      )}

      {/* Effects */}
      {spec.effects.length > 0 && (
        <div className="mb-4 space-y-2">
          {spec.effects.map((effect, index) => (
            <div key={index} className="text-slate-300">
              <span className="font-semibold text-amber-300">
                {TRIGGER_DISPLAY[effect.trigger]}:
              </span>{' '}
              {effect.description}
            </div>
          ))}
        </div>
      )}

      {/* Rules Text */}
      <div className="border-t border-slate-700 pt-4 mt-4">
        <p className="text-slate-400 italic text-sm leading-relaxed">{spec.rulesText}</p>
      </div>

      {/* Tags */}
      {spec.tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {spec.tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 bg-slate-800 text-slate-400 text-xs rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
```

**Step 2: Verify compilation**

Run:
```bash
npx tsc --noEmit
```

Expected: No errors.

**Step 3: Commit**

Run:
```bash
git add src/components/stat-block.tsx && git commit -m "feat: add stat block component"
```

---

## Task 5: Create Weapon Card Component

**Files:**
- Create: `src/components/weapon-card.tsx`

**Step 1: Create weapon card component**

Create file `src/components/weapon-card.tsx`:

```typescript
'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Button, Card, CardContent, CardFooter } from './ui'
import { StatBlock } from './stat-block'
import type { WeaponResponse } from '@/lib/schemas'

interface WeaponCardProps {
  weapon: WeaponResponse
  onRegenerateImage?: () => Promise<void>
  onRerollStats?: () => Promise<void>
}

export function WeaponCard({ weapon, onRegenerateImage, onRerollStats }: WeaponCardProps) {
  const [regeneratingImage, setRegeneratingImage] = useState(false)
  const [rerollingStats, setRerollingStats] = useState(false)
  const [activeTab, setActiveTab] = useState<'stats' | 'lore'>('stats')

  async function handleRegenerateImage() {
    if (!onRegenerateImage) return
    setRegeneratingImage(true)
    try {
      await onRegenerateImage()
    } finally {
      setRegeneratingImage(false)
    }
  }

  async function handleRerollStats() {
    if (!onRerollStats) return
    setRerollingStats(true)
    try {
      await onRerollStats()
    } finally {
      setRerollingStats(false)
    }
  }

  if (!weapon.weaponSpec) {
    return null
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
              className="object-cover"
              priority
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-slate-600">
              No image
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className="flex flex-col">
          {/* Tabs */}
          <div className="flex border-b border-slate-700">
            <button
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
                <div
                  dangerouslySetInnerHTML={{
                    __html: weapon.descriptionMd?.replace(/\n/g, '<br />') ?? '',
                  }}
                />
              </div>
            )}
          </CardContent>

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
```

**Step 2: Verify compilation**

Run:
```bash
npx tsc --noEmit
```

Expected: No errors.

**Step 3: Commit**

Run:
```bash
git add src/components/weapon-card.tsx && git commit -m "feat: add weapon card component"
```

---

## Task 6: Create Weapon List Component

**Files:**
- Create: `src/components/weapon-list.tsx`

**Step 1: Create weapon list component**

Create file `src/components/weapon-list.tsx`:

```typescript
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
              {weapon.status.replace('_', ' ')}
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
              {weapon.rarity.replace('_', ' ')}
            </p>
          )}
          <p className="text-xs text-slate-500 mt-2 line-clamp-2">{weapon.userPrompt}</p>
        </div>
      </Card>
    </Link>
  )
}
```

**Step 2: Verify compilation**

Run:
```bash
npx tsc --noEmit
```

Expected: No errors.

**Step 3: Commit**

Run:
```bash
git add src/components/weapon-list.tsx && git commit -m "feat: add weapon list component"
```

---

## Task 7: Create Polling Hook

**Files:**
- Create: `src/hooks/use-weapon-polling.ts`

**Step 1: Create polling hook**

Create file `src/hooks/use-weapon-polling.ts`:

```typescript
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

  const shouldPoll = weapon.status !== 'done' && weapon.status !== 'error'

  const fetchWeapon = useCallback(async () => {
    try {
      const response = await fetch(`/api/weapons/${weapon.id}`)
      if (!response.ok) {
        throw new Error('Failed to fetch weapon')
      }
      const data = await response.json()
      setWeapon(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    }
  }, [weapon.id])

  useEffect(() => {
    if (!shouldPoll) {
      setIsPolling(false)
      return
    }

    setIsPolling(true)
    const interval = setInterval(fetchWeapon, pollInterval)

    return () => {
      clearInterval(interval)
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
```

**Step 2: Remove .gitkeep**

Run:
```bash
rm -f src/hooks/.gitkeep
```

**Step 3: Create hooks index**

Create file `src/hooks/index.ts`:

```typescript
export { useWeaponPolling } from './use-weapon-polling'
```

**Step 4: Verify compilation**

Run:
```bash
npx tsc --noEmit
```

Expected: No errors.

**Step 5: Commit**

Run:
```bash
git add src/hooks && git commit -m "feat: add weapon polling hook"
```

---

## Task 8: Create Components Index

**Files:**
- Create: `src/components/index.ts`

**Step 1: Create components index**

Create file `src/components/index.ts`:

```typescript
export * from './ui'
export { WeaponForm } from './weapon-form'
export { GenerationProgress } from './generation-progress'
export { StatBlock } from './stat-block'
export { WeaponCard } from './weapon-card'
export { WeaponList } from './weapon-list'
```

**Step 2: Commit**

Run:
```bash
git add src/components/index.ts && git commit -m "feat: add components index"
```

---

## Task 9: Update Home Page

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Update home page with weapon form**

Replace contents of `src/app/page.tsx`:

```typescript
import Link from 'next/link'
import { WeaponForm } from '@/components'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">Fantasy Weapon Generator</h1>
          <p className="text-slate-300 max-w-2xl mx-auto">
            Create unique magical weapons with AI-generated descriptions, balanced stats, and
            stunning artwork. Perfect for D&D, Pathfinder, or any fantasy RPG.
          </p>
        </div>

        <WeaponForm />

        <div className="text-center mt-8">
          <Link
            href="/weapons"
            className="text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            View weapon history →
          </Link>
        </div>
      </div>
    </main>
  )
}
```

**Step 2: Verify compilation**

Run:
```bash
npx tsc --noEmit
```

Expected: No errors.

**Step 3: Commit**

Run:
```bash
git add src/app/page.tsx && git commit -m "feat: update home page with weapon form"
```

---

## Task 10: Create Weapons List Page

**Files:**
- Create: `src/app/weapons/page.tsx`

**Step 1: Create weapons list page**

Create file `src/app/weapons/page.tsx`:

```typescript
import Link from 'next/link'
import { db } from '@/lib/db'
import { WeaponList } from '@/components'
import { toWeaponSummary } from '@/lib/api'

export const dynamic = 'force-dynamic'

export default async function WeaponsPage() {
  const weapons = await db.weapon.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      <div className="container mx-auto px-4 py-16">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white">Weapon History</h1>
          <Link
            href="/"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
          >
            Create New
          </Link>
        </div>

        <WeaponList weapons={weapons.map(toWeaponSummary)} />
      </div>
    </main>
  )
}
```

**Step 2: Verify compilation**

Run:
```bash
npx tsc --noEmit
```

Expected: No errors.

**Step 3: Commit**

Run:
```bash
git add src/app/weapons/page.tsx && git commit -m "feat: add weapons list page"
```

---

## Task 11: Create Weapon Detail Page

**Files:**
- Create: `src/app/weapons/[id]/page.tsx`
- Create: `src/app/weapons/[id]/weapon-detail-client.tsx`

**Step 1: Create client component for weapon detail**

Create file `src/app/weapons/[id]/weapon-detail-client.tsx`:

```typescript
'use client'

import { useRouter } from 'next/navigation'
import { WeaponCard, GenerationProgress } from '@/components'
import { useWeaponPolling } from '@/hooks'
import type { WeaponResponse } from '@/lib/schemas'

interface WeaponDetailClientProps {
  initialWeapon: WeaponResponse
}

export function WeaponDetailClient({ initialWeapon }: WeaponDetailClientProps) {
  const router = useRouter()
  const { weapon, refetch } = useWeaponPolling({ initialWeapon })

  const isGenerating = weapon.status !== 'done' && weapon.status !== 'error'

  async function handleRegenerateImage() {
    await fetch(`/api/weapons/${weapon.id}/regenerate-image`, { method: 'POST' })
    await refetch()
  }

  async function handleRerollStats() {
    await fetch(`/api/weapons/${weapon.id}/reroll-stats`, { method: 'POST' })
    router.refresh()
  }

  if (isGenerating) {
    return <GenerationProgress status={weapon.status} />
  }

  if (weapon.status === 'error') {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-red-400 mb-4">Generation Failed</h2>
        <p className="text-slate-400 mb-6">{weapon.errorMessage}</p>
        <button
          onClick={handleRerollStats}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <WeaponCard
      weapon={weapon}
      onRegenerateImage={handleRegenerateImage}
      onRerollStats={handleRerollStats}
    />
  )
}
```

**Step 2: Create server component page**

Create file `src/app/weapons/[id]/page.tsx`:

```typescript
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { db } from '@/lib/db'
import { toWeaponResponse } from '@/lib/api'
import { WeaponDetailClient } from './weapon-detail-client'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function WeaponDetailPage({ params }: PageProps) {
  const { id } = await params
  const weapon = await db.weapon.findUnique({ where: { id } })

  if (!weapon) {
    notFound()
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      <div className="container mx-auto px-4 py-16">
        <div className="mb-8">
          <Link
            href="/weapons"
            className="text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            ← Back to history
          </Link>
        </div>

        <WeaponDetailClient initialWeapon={toWeaponResponse(weapon)} />
      </div>
    </main>
  )
}
```

**Step 3: Verify compilation**

Run:
```bash
npx tsc --noEmit
```

Expected: No errors.

**Step 4: Commit**

Run:
```bash
git add src/app/weapons/[id] && git commit -m "feat: add weapon detail page"
```

---

## Task 12: Update Next.js Config for Images

**Files:**
- Modify: `next.config.js`

**Step 1: Add remote image patterns**

Replace contents of `next.config.js`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: '**.r2.dev',
      },
      {
        protocol: 'https',
        hostname: '**.r2.cloudflarestorage.com',
      },
    ],
  },
}

module.exports = nextConfig
```

**Step 2: Commit**

Run:
```bash
git add next.config.js && git commit -m "feat: configure remote image patterns"
```

---

## Task 13: Final Verification

**Files:** None (verification only)

**Step 1: Run full build**

Run:
```bash
npm run build
```

Expected: Build succeeds.

**Step 2: Run dev server and verify pages**

Run:
```bash
npm run dev
```

Expected: Pages load without errors at:
- http://localhost:3000 (home with form)
- http://localhost:3000/weapons (list page)

**Step 3: Final commit**

Run:
```bash
git add -A && git commit -m "chore: complete UI components" --allow-empty
```

---

## Component 8 Complete

**Summary of what was created:**
- Base UI components (Button, Input, Select, Card, Spinner)
- WeaponForm component with validation
- GenerationProgress component with status display
- StatBlock component for D&D-style stat blocks
- WeaponCard component with tabs and actions
- WeaponList component for history grid
- useWeaponPolling hook for real-time updates
- Home page with generation form
- Weapons list page
- Weapon detail page with polling

**Next:** Proceed to Component 9 - Auth & Rate Limiting
