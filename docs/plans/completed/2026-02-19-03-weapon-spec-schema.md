# Component 3: WeaponSpec Schema Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Define Zod schemas for weapon stat blocks and generation options, ensuring type-safe validation of LLM outputs.

**Architecture:** Zod schemas that serve dual purpose: runtime validation of LLM JSON output and TypeScript type inference. Schemas are exported for use in API routes and generation pipeline.

**Tech Stack:** Zod 3

**Prerequisite:** Components 1 and 2 must be complete. Verify `package.json`, `tsconfig.json`, and `src/lib/schemas/.gitkeep` exist before starting.

---

## Task 1: Create Rarity Enum Schema

**Files:**
- Create: `src/lib/schemas/rarity.ts`

**Step 1: Create rarity enum schema**

Create file `src/lib/schemas/rarity.ts`:

```typescript
import { z } from 'zod'

export const raritySchema = z.enum([
  'common',
  'uncommon',
  'rare',
  'very_rare',
  'legendary',
  'artifact',
])

export type Rarity = z.infer<typeof raritySchema>

export const RARITY_DISPLAY: Record<Rarity, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  very_rare: 'Very Rare',
  legendary: 'Legendary',
  artifact: 'Artifact',
}

export const RARITY_COLORS: Record<Rarity, string> = {
  common: 'text-gray-400',
  uncommon: 'text-green-400',
  rare: 'text-blue-400',
  very_rare: 'text-purple-400',
  legendary: 'text-orange-400',
  artifact: 'text-red-400',
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
git add src/lib/schemas/rarity.ts && git commit -m "feat: add rarity enum schema"
```

---

## Task 2: Create Damage Schema

**Files:**
- Create: `src/lib/schemas/damage.ts`

**Step 1: Create damage schema**

Create file `src/lib/schemas/damage.ts`:

```typescript
import { z } from 'zod'

export const damageTypeSchema = z.enum([
  'slashing',
  'piercing',
  'bludgeoning',
  'fire',
  'cold',
  'lightning',
  'thunder',
  'acid',
  'poison',
  'necrotic',
  'radiant',
  'force',
  'psychic',
])

export type DamageType = z.infer<typeof damageTypeSchema>

export const damageSchema = z.object({
  dice: z.string().regex(/^[1-9]\d*d[1-9]\d*$/, 'Must be in format "XdY" where X,Y >= 1 (e.g., "2d6")'),
  type: damageTypeSchema,
})

export type Damage = z.infer<typeof damageSchema>
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
git add src/lib/schemas/damage.ts && git commit -m "feat: add damage schema"
```

---

## Task 3: Create Effect Schema

**Files:**
- Create: `src/lib/schemas/effect.ts`

**Step 1: Create effect schema**

Create file `src/lib/schemas/effect.ts`:

```typescript
import { z } from 'zod'

export const effectTriggerSchema = z.enum([
  'on_hit',
  'on_crit',
  'activated',
  'passive',
  'on_attune',
  'on_roll_1',
  'on_roll_20',
])

export type EffectTrigger = z.infer<typeof effectTriggerSchema>

export const effectSchema = z.object({
  trigger: effectTriggerSchema,
  description: z.string().min(1).max(500),
})

export type Effect = z.infer<typeof effectSchema>

export const TRIGGER_DISPLAY: Record<EffectTrigger, string> = {
  on_hit: 'On Hit',
  on_crit: 'On Critical Hit',
  activated: 'Activated',
  passive: 'Passive',
  on_attune: 'On Attunement',
  on_roll_1: 'On Natural 1',
  on_roll_20: 'On Natural 20',
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
git add src/lib/schemas/effect.ts && git commit -m "feat: add effect schema"
```

---

## Task 4: Create Charges Schema

**Files:**
- Create: `src/lib/schemas/charges.ts`

**Step 1: Create charges schema**

Create file `src/lib/schemas/charges.ts`:

```typescript
import { z } from 'zod'

export const chargesSchema = z.object({
  current: z.number().int().min(0),
  max: z.number().int().min(1),
  recharge: z.string().min(1), // e.g., "dawn", "long rest", "1d4 at dawn"
}).refine(({ current, max }) => current <= max, {
  message: 'current charges cannot exceed max charges',
  path: ['current'],
})

export type Charges = z.infer<typeof chargesSchema>
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
git add src/lib/schemas/charges.ts && git commit -m "feat: add charges schema"
```

---

## Task 5: Create WeaponSpec Schema

**Files:**
- Create: `src/lib/schemas/weapon-spec.ts`

**Step 1: Create weapon spec schema**

Create file `src/lib/schemas/weapon-spec.ts`:

```typescript
import { z } from 'zod'
import { raritySchema } from './rarity'
import { damageSchema } from './damage'
import { effectSchema } from './effect'
import { chargesSchema } from './charges'

export const weaponPropertySchema = z.enum([
  'ammunition',
  'finesse',
  'heavy',
  'light',
  'loading',
  'range',
  'reach',
  'special',
  'thrown',
  'two_handed',
  'versatile',
])

export type WeaponProperty = z.infer<typeof weaponPropertySchema>

export const weaponSpecSchema = z.object({
  name: z.string().min(1).max(100),
  rarity: raritySchema,
  weaponType: z.string().min(1).max(50), // e.g., "longsword", "shortbow", "warhammer"
  properties: z.array(weaponPropertySchema).default([]),
  damage: damageSchema,
  toHitBonus: z.number().int().min(-5).max(10).optional(),
  damageBonus: z.number().int().min(-5).max(10).optional(),
  charges: chargesSchema.optional(),
  effects: z.array(effectSchema).max(10).default([]),
  rulesText: z.string().min(1).max(2000),
  tags: z.array(z.string().min(1).max(30)).max(20).default([]),
})

export type WeaponSpec = z.infer<typeof weaponSpecSchema>

// For LLM prompt generation - describes the expected schema
export const WEAPON_SPEC_SCHEMA_DESCRIPTION = `{
  "name": "string (1-100 chars, the weapon's name)",
  "rarity": "common" | "uncommon" | "rare" | "very_rare" | "legendary" | "artifact",
  "weaponType": "string (e.g., 'longsword', 'shortbow', 'dagger')",
  "properties": ["finesse", "thrown", "versatile", etc.] (optional array),
  "damage": { "dice": "XdY format (e.g., '1d8')", "type": "slashing" | "piercing" | "bludgeoning" | etc. },
  "toHitBonus": number (optional, -5 to +10),
  "damageBonus": number (optional, -5 to +10),
  "charges": { "current": number, "max": number, "recharge": "string" } (optional),
  "effects": [{ "trigger": "on_hit" | "on_crit" | "activated" | "passive" | "on_attune" | "on_roll_1" | "on_roll_20", "description": "string" }] (max 10),
  "rulesText": "string (complete rules text for the item)",
  "tags": ["string"] (max 20, keywords for searching)
}`
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
git add src/lib/schemas/weapon-spec.ts && git commit -m "feat: add weapon spec schema"
```

---

## Task 6: Create Generation Options Schema

**Files:**
- Create: `src/lib/schemas/generation-options.ts`

**Step 1: Create generation options schema**

Create file `src/lib/schemas/generation-options.ts`:

```typescript
import { z } from 'zod'
import { raritySchema } from './rarity'

export const rulesetSchema = z.enum(['dnd5e', 'pathfinder2e', 'generic'])

export type Ruleset = z.infer<typeof rulesetSchema>

export const styleSchema = z.enum([
  'realistic',
  'fantasy_art',
  'dark_fantasy',
  'anime',
  'pixel_art',
  'watercolor',
])

export type Style = z.infer<typeof styleSchema>

export const generationOptionsSchema = z.object({
  ruleset: rulesetSchema.default('dnd5e'),
  rarity: raritySchema.optional(), // If not specified, LLM chooses appropriate rarity
  style: styleSchema.default('fantasy_art'),
  seed: z.number().int().optional(), // For reproducibility
})

export type GenerationOptions = z.infer<typeof generationOptionsSchema>

export const RULESET_DISPLAY: Record<Ruleset, string> = {
  dnd5e: 'D&D 5th Edition',
  pathfinder2e: 'Pathfinder 2e',
  generic: 'Generic Fantasy',
}

export const STYLE_DISPLAY: Record<Style, string> = {
  realistic: 'Realistic',
  fantasy_art: 'Fantasy Art',
  anime: 'Anime',
  pixel_art: 'Pixel Art',
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
git add src/lib/schemas/generation-options.ts && git commit -m "feat: add generation options schema"
```

---

## Task 7: Create Generation Result Schema

**Files:**
- Create: `src/lib/schemas/generation-result.ts`

**Step 1: Create generation result schema**

Create file `src/lib/schemas/generation-result.ts`:

```typescript
import { z } from 'zod'
import { weaponSpecSchema } from './weapon-spec'

// Schema for what the LLM should return
export const textGenerationResultSchema = z.object({
  weaponSpec: weaponSpecSchema,
  descriptionMd: z.string().min(1).max(5000),
})

export type TextGenerationResult = z.infer<typeof textGenerationResultSchema>

// For LLM prompt - the full expected JSON structure
export const TEXT_GENERATION_SCHEMA_DESCRIPTION = `{
  "weaponSpec": <WeaponSpec object>,
  "descriptionMd": "string (1-5000 chars, markdown formatted flavor text and lore)"
}`
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
git add src/lib/schemas/generation-result.ts && git commit -m "feat: add generation result schema"
```

---

## Task 8: Create Schema Index

**Files:**
- Create: `src/lib/schemas/index.ts`

**Step 1: Create index file exporting all schemas**

Create file `src/lib/schemas/index.ts`:

```typescript
// Enums and primitives
export { raritySchema, RARITY_DISPLAY, RARITY_COLORS } from './rarity'
export type { Rarity } from './rarity'

export { damageTypeSchema, damageSchema } from './damage'
export type { DamageType, Damage } from './damage'

export { effectTriggerSchema, effectSchema, TRIGGER_DISPLAY } from './effect'
export type { EffectTrigger, Effect } from './effect'

export { chargesSchema } from './charges'
export type { Charges } from './charges'

// Main schemas
export {
  weaponPropertySchema,
  weaponSpecSchema,
  WEAPON_SPEC_SCHEMA_DESCRIPTION,
} from './weapon-spec'
export type { WeaponProperty, WeaponSpec } from './weapon-spec'

export {
  rulesetSchema,
  styleSchema,
  generationOptionsSchema,
  RULESET_DISPLAY,
  STYLE_DISPLAY,
} from './generation-options'
export type { Ruleset, Style, GenerationOptions } from './generation-options'

export { textGenerationResultSchema, TEXT_GENERATION_SCHEMA_DESCRIPTION } from './generation-result'
export type { TextGenerationResult } from './generation-result'
```

**Step 2: Verify all exports compile**

Run:
```bash
npx tsc --noEmit
```

Expected: No errors.

**Step 3: Commit**

Run:
```bash
git add src/lib/schemas/index.ts && git commit -m "feat: add schemas index with all exports"
```

---

## Task 9: Write Schema Unit Tests

**Files:**
- Create: `src/lib/schemas/__tests__/weapon-spec.test.ts`

**Step 1: Install test dependencies**

Run:
```bash
npm install -D vitest
```

Expected: vitest added to devDependencies.

**Step 2: Create vitest config**

Create file `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

**Step 3: Add test script to package.json**

Add to `package.json` scripts:
```json
"test": "vitest",
"test:run": "vitest run"
```

**Step 4: Create weapon spec tests**

Create directory and file `src/lib/schemas/__tests__/weapon-spec.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { weaponSpecSchema, generationOptionsSchema, textGenerationResultSchema, chargesSchema } from '../index'

describe('weaponSpecSchema', () => {
  it('validates a complete weapon spec', () => {
    const validWeapon = {
      name: 'Flametongue',
      rarity: 'rare',
      weaponType: 'longsword',
      properties: ['versatile'],
      damage: { dice: '1d8', type: 'slashing' },
      toHitBonus: 1,
      damageBonus: 1,
      effects: [
        { trigger: 'on_hit', description: 'Deal 2d6 fire damage' },
        { trigger: 'activated', description: 'Blade ignites on command' },
      ],
      rulesText: 'You gain a +1 bonus to attack and damage rolls...',
      tags: ['fire', 'sword', 'ignite'],
    }

    const result = weaponSpecSchema.safeParse(validWeapon)
    expect(result.success).toBe(true)
  })

  it('validates a minimal weapon spec', () => {
    const minimalWeapon = {
      name: 'Simple Dagger',
      rarity: 'common',
      weaponType: 'dagger',
      damage: { dice: '1d4', type: 'piercing' },
      rulesText: 'A simple dagger.',
    }

    const result = weaponSpecSchema.safeParse(minimalWeapon)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.properties).toEqual([])
      expect(result.data.effects).toEqual([])
      expect(result.data.tags).toEqual([])
    }
  })

  it('rejects invalid damage dice format', () => {
    const invalidWeapon = {
      name: 'Bad Weapon',
      rarity: 'common',
      weaponType: 'sword',
      damage: { dice: '2', type: 'slashing' }, // Invalid format
      rulesText: 'Rules text here.',
    }

    const result = weaponSpecSchema.safeParse(invalidWeapon)
    expect(result.success).toBe(false)
  })

  it('rejects invalid rarity', () => {
    const invalidWeapon = {
      name: 'Bad Weapon',
      rarity: 'super_legendary', // Invalid
      weaponType: 'sword',
      damage: { dice: '1d6', type: 'slashing' },
      rulesText: 'Rules text here.',
    }

    const result = weaponSpecSchema.safeParse(invalidWeapon)
    expect(result.success).toBe(false)
  })

  it('rejects effects array exceeding max length', () => {
    const weapon = {
      name: 'Overloaded Weapon',
      rarity: 'rare',
      weaponType: 'sword',
      damage: { dice: '1d6', type: 'slashing' },
      effects: Array.from({ length: 11 }, (_, i) => ({
        trigger: 'on_hit',
        description: `Effect ${i}`,
      })),
      rulesText: 'Rules text here.',
    }

    const result = weaponSpecSchema.safeParse(weapon)
    expect(result.success).toBe(false)
  })

  it('rejects tags array exceeding max length', () => {
    const weapon = {
      name: 'Over-tagged Weapon',
      rarity: 'common',
      weaponType: 'sword',
      damage: { dice: '1d6', type: 'slashing' },
      tags: Array.from({ length: 21 }, (_, i) => `tag${i}`),
      rulesText: 'Rules text here.',
    }

    const result = weaponSpecSchema.safeParse(weapon)
    expect(result.success).toBe(false)
  })
})

describe('chargesSchema', () => {
  it('validates valid charges', () => {
    const result = chargesSchema.safeParse({ current: 3, max: 5, recharge: 'dawn' })
    expect(result.success).toBe(true)
  })

  it('rejects current > max', () => {
    const result = chargesSchema.safeParse({ current: 6, max: 5, recharge: 'dawn' })
    expect(result.success).toBe(false)
  })

  it('allows current equal to max', () => {
    const result = chargesSchema.safeParse({ current: 5, max: 5, recharge: 'dawn' })
    expect(result.success).toBe(true)
  })
})

describe('generationOptionsSchema', () => {
  it('provides defaults for minimal input', () => {
    const result = generationOptionsSchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.ruleset).toBe('dnd5e')
      expect(result.data.style).toBe('fantasy_art')
    }
  })

  it('accepts full options', () => {
    const options = {
      ruleset: 'pathfinder2e',
      rarity: 'legendary',
      style: 'dark_fantasy',
      seed: 12345,
    }

    const result = generationOptionsSchema.safeParse(options)
    expect(result.success).toBe(true)
  })
})

describe('textGenerationResultSchema', () => {
  it('validates complete generation result', () => {
    const result = {
      weaponSpec: {
        name: 'Test Sword',
        rarity: 'uncommon',
        weaponType: 'shortsword',
        damage: { dice: '1d6', type: 'piercing' },
        rulesText: 'A test weapon.',
      },
      descriptionMd: '# Test Sword\n\nA magical blade...',
    }

    const parsed = textGenerationResultSchema.safeParse(result)
    expect(parsed.success).toBe(true)
  })
})
```

**Step 5: Run tests**

Run:
```bash
npm run test:run
```

Expected: All tests pass.

**Step 6: Commit**

Run:
```bash
git add vitest.config.ts src/lib/schemas/__tests__/weapon-spec.test.ts package.json package-lock.json && git commit -m "feat: add schema unit tests"
```

---

## Task 10: Remove .gitkeep Files

**Files:**
- Delete: `src/lib/schemas/.gitkeep`

**Step 1: Remove placeholder file**

Run:
```bash
rm -f src/lib/schemas/.gitkeep
```

**Step 2: Commit**

Run:
```bash
git add src/lib/schemas/.gitkeep && git commit -m "chore: remove .gitkeep from schemas directory"
```

---

## Task 11: Final Verification

**Files:** None (verification only)

**Step 1: Run full build**

Run:
```bash
npm run build
```

Expected: Build succeeds.

**Step 2: Run tests**

Run:
```bash
npm run test:run
```

Expected: All tests pass.

---

## Component 3 Complete

**Summary of what was created:**
- Rarity enum schema with display names and colors
- Damage schema (dice + damage type)
- Effect schema (trigger + description)
- Charges schema (for items with uses)
- WeaponSpec schema (complete stat block)
- GenerationOptions schema (ruleset, rarity, style)
- TextGenerationResult schema (what LLM returns)
- Schema descriptions for LLM prompts
- Unit tests for all schemas
- Vitest test configuration

**Next:** Proceed to Component 4 - S3 Storage
