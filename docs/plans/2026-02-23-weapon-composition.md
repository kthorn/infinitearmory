# Weapon Composition Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow users to select existing weapons when creating turrets/mechs, injecting those weapon specs into the generation prompt so the AI incorporates them into the new design.

**Architecture:** No schema changes. The creation form gets a weapon picker (visible for turret/mech categories only). Selected weapon IDs are passed as `incorporatedWeaponIds` in the request options. The backend fetches those weapons' specs and appends them to the generation prompt. The relationship is baked into the generated output — no persistent linkage tracked.

**Tech Stack:** Next.js, React, Zod, Prisma, existing text providers

---

### Task 1: Add `incorporatedWeaponIds` to the generation options schema

**Files:**
- Modify: `src/lib/schemas/generation-options.ts:43-51`

**Step 1: Update the schema**

Add `incorporatedWeaponIds` as an optional string array to `generationOptionsSchema`:

```typescript
export const generationOptionsSchema = z.object({
  category: categorySchema.default('fantasy_weapon'),
  ruleset: rulesetSchema.default('dnd5e'),
  rarity: raritySchema.optional(),
  style: styleSchema.default('fantasy_art'),
  seed: z.number().int().optional(),
  textModel: z.string().refine((id) => validTextModelIds.includes(id), { message: 'Invalid text model ID' }).optional(),
  imageModel: z.string().refine((id) => validImageModelIds.includes(id), { message: 'Invalid image model ID' }).optional(),
  incorporatedWeaponIds: z.array(z.string()).max(6).optional(),
})
```

**Step 2: Add the category filter map**

Below `CATEGORY_DEFAULT_STYLE`, add:

```typescript
// Which categories can be incorporated into a given parent category
export const INCORPORABLE_CATEGORIES: Partial<Record<Category, Category[]>> = {
  scifi_turret: ['scifi_handheld'],
  mech: ['scifi_handheld', 'scifi_turret'],
}
```

**Step 3: Verify the app compiles**

Run: `cd /home/kurtt/weapon-gen && npx next build 2>&1 | tail -5`
Expected: Build succeeds (the new field is optional, nothing breaks)

**Step 4: Commit**

```bash
git add src/lib/schemas/generation-options.ts
git commit -m "feat: add incorporatedWeaponIds to generation options schema"
```

---

### Task 2: Fetch incorporated weapons in the orchestrator and pass to prompt builder

**Files:**
- Modify: `src/lib/generation/orchestrator.ts:22-35`
- Modify: `src/lib/providers/text/anthropic.ts:20-21`
- Modify: `src/lib/providers/text/openai.ts` (same pattern)
- Modify: `src/lib/providers/text/gemini.ts` (same pattern)
- Modify: `src/lib/providers/types.ts:9-11`

**Step 1: Update the TextProvider interface**

In `src/lib/providers/types.ts`, add an optional `incorporatedWeapons` parameter:

```typescript
export interface TextProvider {
  generateWeapon(prompt: string, options: GenerationOptions, incorporatedWeapons?: IncorporatedWeapon[]): Promise<TextGenerationResult>
}

export interface IncorporatedWeapon {
  name: string
  category: string
  rarity: string
  weaponSpec: Record<string, unknown>
}
```

**Step 2: Fetch weapons in the orchestrator**

In `src/lib/generation/orchestrator.ts`, after the `updateStatus` call at line 25, add weapon fetching:

```typescript
export async function generateWeapon({ weaponId, userPrompt, options }: GenerateWeaponParams): Promise<void> {
  try {
    // Step 1: Generate text (description + stats)
    await updateStatus(weaponId, WEAPON_STATUS.GENERATING_TEXT)

    // Fetch incorporated weapons if specified
    const incorporatedWeapons = await fetchIncorporatedWeapons(options.incorporatedWeaponIds)

    const textProvider = getTextProvider(options.textModel)
    const textResult = await withRetry(
      () => textProvider.generateWeapon(userPrompt, options, incorporatedWeapons),
      {
        maxAttempts: 2,
        delayMs: 2000,
        shouldRetry: isTransientError,
      }
    )
    // ... rest unchanged
```

Add the helper function at the bottom of the file:

```typescript
import type { IncorporatedWeapon } from '@/lib/providers/types'

async function fetchIncorporatedWeapons(ids?: string[]): Promise<IncorporatedWeapon[]> {
  if (!ids || ids.length === 0) return []

  const weapons = await db.weapon.findMany({
    where: {
      id: { in: ids },
      status: 'done',
      weaponSpec: { not: null },
    },
  })

  return weapons.map((w) => {
    const spec = JSON.parse(w.weaponSpec!) as Record<string, unknown>
    return {
      name: (spec.name as string) ?? 'Unknown',
      category: (spec.category as string) ?? 'unknown',
      rarity: (spec.rarity as string) ?? 'common',
      weaponSpec: spec,
    }
  })
}
```

**Step 3: Pass through in each text provider**

In each text provider (`anthropic.ts`, `openai.ts`, `gemini.ts`), update the `generateWeapon` signature and pass `incorporatedWeapons` to `buildWeaponPrompt`:

```typescript
// In anthropic.ts line 20:
async generateWeapon(prompt: string, options: GenerationOptions, incorporatedWeapons?: IncorporatedWeapon[]): Promise<TextGenerationResult> {
  const userPrompt = buildWeaponPrompt(prompt, options, incorporatedWeapons)
  // ... rest unchanged
```

Same pattern for openai.ts and gemini.ts.

**Step 4: Verify the app compiles**

Run: `cd /home/kurtt/weapon-gen && npx next build 2>&1 | tail -5`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add src/lib/generation/orchestrator.ts src/lib/providers/types.ts src/lib/providers/text/anthropic.ts src/lib/providers/text/openai.ts src/lib/providers/text/gemini.ts
git commit -m "feat: fetch incorporated weapons and pass through to prompt builder"
```

---

### Task 3: Inject incorporated weapon specs into generation prompts

**Files:**
- Modify: `src/lib/providers/prompts/weapon-generation.ts:9-21` (buildWeaponPrompt)
- Modify: `src/lib/providers/prompts/weapon-generation.ts:88-117` (buildTurretPrompt)
- Modify: `src/lib/providers/prompts/weapon-generation.ts:119-150` (buildMechPrompt)

**Step 1: Update buildWeaponPrompt to accept and pass incorporated weapons**

```typescript
import type { IncorporatedWeapon } from '../types'

export function buildWeaponPrompt(userPrompt: string, options: GenerationOptions, incorporatedWeapons?: IncorporatedWeapon[]): string {
  const category = options.category ?? 'fantasy_weapon'

  switch (category) {
    case 'fantasy_weapon':
      return buildFantasyWeaponPrompt(userPrompt, options)
    case 'scifi_handheld':
      return buildSciFiHandheldPrompt(userPrompt, options)
    case 'scifi_turret':
      return buildTurretPrompt(userPrompt, options, incorporatedWeapons)
    case 'mech':
      return buildMechPrompt(userPrompt, options, incorporatedWeapons)
  }
}
```

**Step 2: Add a helper to format incorporated weapon specs for the prompt**

```typescript
function formatIncorporatedWeapons(weapons: IncorporatedWeapon[]): string {
  if (weapons.length === 0) return ''

  const entries = weapons.map((w) => {
    const spec = w.weaponSpec
    const lines = [
      `**${w.name}** (${w.category.replace('_', ' ')}, ${w.rarity})`,
    ]

    if (spec.damage && typeof spec.damage === 'object') {
      const dmg = spec.damage as Record<string, unknown>
      lines.push(`- Damage: ${dmg.dice ?? '?'} ${dmg.type ?? ''}`)
    }

    if (spec.firingMode) lines.push(`- Firing Mode: ${spec.firingMode}`)
    if (spec.range) lines.push(`- Range: ${spec.range}`)
    if (spec.mountType) lines.push(`- Mount Type: ${spec.mountType}`)
    if (spec.rateOfFire) lines.push(`- Rate of Fire: ${spec.rateOfFire}`)
    if (spec.ammoCapacity) lines.push(`- Ammo: ${spec.ammoCapacity}`)
    if (spec.energyCost) lines.push(`- Energy Cost: ${spec.energyCost}`)
    if (spec.weaponClass) lines.push(`- Weapon Class: ${spec.weaponClass}`)

    if (spec.rulesText) lines.push(`- Rules: ${spec.rulesText}`)

    return lines.join('\n')
  }).join('\n\n')

  return `
INCORPORATED WEAPONS:
The user wants to build this around the following existing weapon(s). Reference their names, stats, and characteristics in your design. Use them as the basis for weapon systems — do not reinvent them, incorporate them as-is into the design.

${entries}
`
}
```

**Step 3: Inject into buildTurretPrompt**

```typescript
function buildTurretPrompt(userPrompt: string, options: GenerationOptions, incorporatedWeapons?: IncorporatedWeapon[]): string {
  const rarityInstruction = getRarityInstruction(options)
  const incorporated = incorporatedWeapons?.length ? formatIncorporatedWeapons(incorporatedWeapons) : ''

  return `You are a sci-fi defense systems engineer designing a turret or emplaced weapon for a tabletop RPG.

USER'S CONCEPT:
${userPrompt}
${incorporated}
REQUIREMENTS:
...` // rest unchanged
}
```

**Step 4: Inject into buildMechPrompt**

Same pattern — add the `incorporatedWeapons` param, format and inject between `USER'S CONCEPT` and `REQUIREMENTS`:

```typescript
function buildMechPrompt(userPrompt: string, options: GenerationOptions, incorporatedWeapons?: IncorporatedWeapon[]): string {
  const rarityInstruction = getRarityInstruction(options)
  const incorporated = incorporatedWeapons?.length ? formatIncorporatedWeapons(incorporatedWeapons) : ''

  return `You are a BattleTech-inspired mech designer creating a combat mech for a tabletop RPG.

USER'S CONCEPT:
${userPrompt}
${incorporated}
REQUIREMENTS:
...` // rest unchanged
}
```

**Step 5: Verify the app compiles**

Run: `cd /home/kurtt/weapon-gen && npx next build 2>&1 | tail -5`
Expected: Build succeeds

**Step 6: Commit**

```bash
git add src/lib/providers/prompts/weapon-generation.ts
git commit -m "feat: inject incorporated weapon specs into turret and mech prompts"
```

---

### Task 4: Add API endpoint to list incorporable weapons

**Files:**
- Create: `src/app/api/weapons/incorporable/route.ts`

We need a lightweight endpoint the form can call to get a list of completed weapons filtered by valid child categories.

**Step 1: Create the route**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { categorySchema } from '@/lib/schemas'
import { INCORPORABLE_CATEGORIES } from '@/lib/schemas'
import { badRequest, serverError } from '@/lib/api'

/**
 * GET /api/weapons/incorporable?parentCategory=mech
 * Returns completed weapons that can be incorporated into the given parent category.
 */
export async function GET(request: NextRequest) {
  try {
    const parentCategory = request.nextUrl.searchParams.get('parentCategory')
    if (!parentCategory) {
      return badRequest('parentCategory is required')
    }

    const parsed = categorySchema.safeParse(parentCategory)
    if (!parsed.success) {
      return badRequest('Invalid category')
    }

    const childCategories = INCORPORABLE_CATEGORIES[parsed.data]
    if (!childCategories) {
      return NextResponse.json({ weapons: [] })
    }

    const weapons = await db.weapon.findMany({
      where: {
        status: 'done',
        weaponSpec: { not: null },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    // Filter by category from the JSON weaponSpec field
    const filtered = weapons
      .map((w) => {
        const spec = JSON.parse(w.weaponSpec!) as Record<string, unknown>
        const category = (spec.category as string) ?? 'fantasy_weapon'
        return {
          id: w.id,
          name: (spec.name as string) ?? 'Unknown',
          category,
          rarity: (spec.rarity as string) ?? 'common',
          imageUrl: w.imageUrl,
        }
      })
      .filter((w) => childCategories.includes(w.category as any))

    return NextResponse.json({ weapons: filtered })
  } catch (error) {
    console.error('GET /api/weapons/incorporable error:', error)
    return serverError('Failed to list incorporable weapons')
  }
}
```

**Step 2: Verify the app compiles**

Run: `cd /home/kurtt/weapon-gen && npx next build 2>&1 | tail -5`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/app/api/weapons/incorporable/route.ts
git commit -m "feat: add GET /api/weapons/incorporable endpoint"
```

---

### Task 5: Add weapon picker component

**Files:**
- Create: `src/components/weapon-picker.tsx`

**Step 1: Create the component**

This component fetches incorporable weapons and lets the user select/deselect them.

```tsx
'use client'

import { useState, useEffect } from 'react'
import { RARITY_COLORS, CATEGORY_DISPLAY } from '@/lib/schemas'
import type { Category } from '@/lib/schemas'

interface IncorporableWeapon {
  id: string
  name: string
  category: string
  rarity: string
  imageUrl: string | null
}

interface WeaponPickerProps {
  parentCategory: Category
  selectedIds: string[]
  onChange: (ids: string[]) => void
  disabled?: boolean
}

export function WeaponPicker({ parentCategory, selectedIds, onChange, disabled }: WeaponPickerProps) {
  const [weapons, setWeapons] = useState<IncorporableWeapon[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/weapons/incorporable?parentCategory=${parentCategory}`)
      .then((r) => r.json())
      .then((data) => setWeapons(data.weapons ?? []))
      .catch(() => setWeapons([]))
      .finally(() => setLoading(false))
  }, [parentCategory])

  if (loading) {
    return <p className="text-sm text-slate-500">Loading weapons...</p>
  }

  if (weapons.length === 0) {
    return <p className="text-sm text-slate-500">No compatible weapons available. Create some handheld weapons or turrets first.</p>
  }

  function toggle(id: string) {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((i) => i !== id))
    } else if (selectedIds.length < 6) {
      onChange([...selectedIds, id])
    }
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto">
        {weapons.map((w) => {
          const selected = selectedIds.includes(w.id)
          return (
            <button
              key={w.id}
              type="button"
              disabled={disabled || (!selected && selectedIds.length >= 6)}
              onClick={() => toggle(w.id)}
              className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-colors ${
                selected
                  ? 'border-indigo-500 bg-indigo-500/20'
                  : 'border-slate-700 bg-slate-800 hover:border-slate-600'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {w.imageUrl ? (
                <img src={w.imageUrl} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded bg-slate-700 flex-shrink-0" />
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">{w.name}</p>
                <p className="text-xs text-slate-400">
                  <span className={RARITY_COLORS[w.rarity as keyof typeof RARITY_COLORS] ?? 'text-slate-400'}>
                    {w.rarity}
                  </span>
                  {' · '}
                  {CATEGORY_DISPLAY[w.category as Category] ?? w.category}
                </p>
              </div>
              {selected && (
                <span className="ml-auto text-indigo-400 text-sm flex-shrink-0">✓</span>
              )}
            </button>
          )
        })}
      </div>
      {selectedIds.length > 0 && (
        <p className="text-xs text-slate-500">{selectedIds.length}/6 weapons selected</p>
      )}
    </div>
  )
}
```

**Step 2: Verify the app compiles**

Run: `cd /home/kurtt/weapon-gen && npx next build 2>&1 | tail -5`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add src/components/weapon-picker.tsx
git commit -m "feat: add WeaponPicker component for selecting incorporated weapons"
```

---

### Task 6: Integrate weapon picker into the creation form

**Files:**
- Modify: `src/components/weapon-form.tsx`

**Step 1: Add state and import**

At the top of `weapon-form.tsx`, add the import:

```typescript
import { WeaponPicker } from './weapon-picker'
import { INCORPORABLE_CATEGORIES } from '@/lib/schemas'
```

Inside `WeaponForm`, add state:

```typescript
const [incorporatedWeaponIds, setIncorporatedWeaponIds] = useState<string[]>([])
```

**Step 2: Reset incorporated weapons on category change**

In `handleCategoryChange`, add:

```typescript
function handleCategoryChange(newCategory: Category) {
  setCategory(newCategory)
  setIncorporatedWeaponIds([]) // Reset when category changes
  const availableStyles = CATEGORY_STYLES[newCategory]
  if (!availableStyles.includes(style)) {
    setStyle(CATEGORY_DEFAULT_STYLE[newCategory])
  }
}
```

**Step 3: Add picker to the form JSX**

After the model selects grid (after line 170, before the error div), add:

```tsx
{INCORPORABLE_CATEGORIES[category] && (
  <div>
    <label className="block text-sm font-medium text-slate-300 mb-1">
      Incorporate Existing Weapons (optional)
    </label>
    <WeaponPicker
      parentCategory={category}
      selectedIds={incorporatedWeaponIds}
      onChange={setIncorporatedWeaponIds}
      disabled={loading}
    />
  </div>
)}
```

**Step 4: Include selected IDs in the API request**

In `handleSubmit`, add `incorporatedWeaponIds` to the options:

```typescript
body: JSON.stringify({
  prompt,
  options: {
    category,
    ruleset: CATEGORY_RULESET[category],
    style,
    ...(rarity && { rarity }),
    ...(incorporatedWeaponIds.length > 0 && { incorporatedWeaponIds }),
    textModel,
    imageModel,
  },
}),
```

**Step 5: Verify the app compiles and test manually**

Run: `cd /home/kurtt/weapon-gen && npx next build 2>&1 | tail -5`
Expected: Build succeeds

Manual test:
1. Create a sci-fi handheld weapon and wait for it to complete
2. Go to create a new mech — the weapon picker should appear
3. Select the handheld weapon
4. Submit — the generated mech should reference the handheld weapon in its weapon systems and lore

**Step 6: Commit**

```bash
git add src/components/weapon-form.tsx
git commit -m "feat: integrate weapon picker into creation form for turrets and mechs"
```

---

### Task 7: Export INCORPORABLE_CATEGORIES from schemas index

**Files:**
- Modify: `src/lib/schemas/index.ts:37-49`

**Step 1: Add the export**

Add `INCORPORABLE_CATEGORIES` to the existing export block from `generation-options`:

```typescript
export {
  categorySchema,
  rulesetSchema,
  styleSchema,
  generationOptionsSchema,
  CATEGORY_DISPLAY,
  RULESET_DISPLAY,
  STYLE_DISPLAY,
  CATEGORY_STYLES,
  CATEGORY_RULESET,
  CATEGORY_DEFAULT_STYLE,
  INCORPORABLE_CATEGORIES,
} from './generation-options'
```

> **Note:** This should be done as part of Task 1 but is listed separately as a reminder. In practice, do this in the same commit as Task 1.

---

## Summary

| Task | What | Files Changed |
|------|------|---------------|
| 1 | Schema: add `incorporatedWeaponIds` + `INCORPORABLE_CATEGORIES` | `generation-options.ts`, `schemas/index.ts` |
| 2 | Orchestrator: fetch weapons, pass through providers | `orchestrator.ts`, `types.ts`, 3 text providers |
| 3 | Prompts: inject weapon specs into turret/mech prompts | `weapon-generation.ts` |
| 4 | API: `/api/weapons/incorporable` endpoint | New route file |
| 5 | UI: `WeaponPicker` component | New component file |
| 6 | UI: Wire picker into `WeaponForm` | `weapon-form.tsx` |

No database migration. No schema changes to Prisma. The incorporated weapons are prompt context only — the generated weapon stands alone as a complete record.
