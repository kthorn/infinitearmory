# Model Selection UI Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add UI dropdowns to select specific text and image generation models from each provider (OpenAI, Anthropic, Google).

**Architecture:** Static model registry shared between client/server. Form sends model IDs in options. Provider factories create per-request instances for the chosen model. New Gemini text provider added. Select component extended with optgroup support.

**Tech Stack:** Next.js 16, React 19, Zod 4, Vitest, `openai` SDK, `@anthropic-ai/sdk`, `@google/genai`

---

### Task 1: Create Model Registry

**Files:**
- Create: `src/lib/models.ts`
- Test: `src/lib/__tests__/models.test.ts`

**Step 1: Write the failing test**

```typescript
// src/lib/__tests__/models.test.ts
import { describe, it, expect } from 'vitest'
import {
  TEXT_MODELS,
  IMAGE_MODELS,
  resolveTextProvider,
  resolveImageProvider,
  getDefaultTextModel,
  getDefaultImageModel,
  getAllTextModels,
  getAllImageModels,
} from '../models'

describe('models', () => {
  describe('TEXT_MODELS', () => {
    it('has openai, anthropic, and gemini providers', () => {
      expect(Object.keys(TEXT_MODELS)).toEqual(
        expect.arrayContaining(['openai', 'anthropic', 'gemini'])
      )
    })

    it('each model has id and label', () => {
      for (const models of Object.values(TEXT_MODELS)) {
        for (const model of models) {
          expect(model).toHaveProperty('id')
          expect(model).toHaveProperty('label')
        }
      }
    })

    it('has exactly one default per provider', () => {
      for (const models of Object.values(TEXT_MODELS)) {
        const defaults = models.filter((m) => m.default)
        expect(defaults).toHaveLength(1)
      }
    })
  })

  describe('IMAGE_MODELS', () => {
    it('has openai and gemini providers', () => {
      expect(Object.keys(IMAGE_MODELS)).toEqual(
        expect.arrayContaining(['openai', 'gemini'])
      )
    })

    it('has exactly one default per provider', () => {
      for (const models of Object.values(IMAGE_MODELS)) {
        const defaults = models.filter((m) => m.default)
        expect(defaults).toHaveLength(1)
      }
    })
  })

  describe('resolveTextProvider', () => {
    it('resolves openai models', () => {
      expect(resolveTextProvider('gpt-5.2')).toBe('openai')
    })

    it('resolves anthropic models', () => {
      expect(resolveTextProvider('claude-sonnet-4-6')).toBe('anthropic')
    })

    it('resolves gemini models', () => {
      expect(resolveTextProvider('gemini-2.5-flash')).toBe('gemini')
    })

    it('throws for unknown model', () => {
      expect(() => resolveTextProvider('unknown-model')).toThrow()
    })
  })

  describe('resolveImageProvider', () => {
    it('resolves openai models', () => {
      expect(resolveImageProvider('gpt-image-1')).toBe('openai')
    })

    it('resolves gemini models', () => {
      expect(resolveImageProvider('gemini-2.5-flash-image')).toBe('gemini')
    })

    it('throws for unknown model', () => {
      expect(() => resolveImageProvider('unknown-model')).toThrow()
    })
  })

  describe('getAllTextModels', () => {
    it('returns flat array of all text models', () => {
      const all = getAllTextModels()
      expect(all.length).toBeGreaterThan(0)
      expect(all.every((m) => m.id && m.label && m.provider)).toBe(true)
    })
  })

  describe('getAllImageModels', () => {
    it('returns flat array of all image models', () => {
      const all = getAllImageModels()
      expect(all.length).toBeGreaterThan(0)
      expect(all.every((m) => m.id && m.label && m.provider)).toBe(true)
    })
  })

  describe('getDefaultTextModel', () => {
    it('returns a valid model id', () => {
      const id = getDefaultTextModel()
      expect(resolveTextProvider(id)).toBeDefined()
    })
  })

  describe('getDefaultImageModel', () => {
    it('returns a valid model id', () => {
      const id = getDefaultImageModel()
      expect(resolveImageProvider(id)).toBeDefined()
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/__tests__/models.test.ts`
Expected: FAIL — module not found

**Step 3: Write implementation**

```typescript
// src/lib/models.ts

export interface ModelOption {
  id: string
  label: string
  default?: boolean
}

export const TEXT_MODELS: Record<string, ModelOption[]> = {
  openai: [
    { id: 'gpt-5.2', label: 'GPT-5.2', default: true },
    { id: 'gpt-5', label: 'GPT-5' },
    { id: 'gpt-5-mini', label: 'GPT-5 Mini' },
  ],
  anthropic: [
    { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6', default: true },
    { id: 'claude-opus-4-6', label: 'Claude Opus 4.6' },
    { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5' },
    { id: 'claude-sonnet-4-0', label: 'Claude Sonnet 4' },
  ],
  gemini: [
    { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', default: true },
    { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
  ],
}

export const IMAGE_MODELS: Record<string, ModelOption[]> = {
  openai: [
    { id: 'gpt-image-1', label: 'GPT Image 1', default: true },
    { id: 'gpt-image-1-mini', label: 'GPT Image 1 Mini' },
  ],
  gemini: [
    { id: 'gemini-2.5-flash-image', label: 'Gemini 2.5 Flash', default: true },
    { id: 'imagen-4.0-generate-001', label: 'Imagen 4' },
    { id: 'imagen-4.0-ultra-generate-001', label: 'Imagen 4 Ultra' },
    { id: 'imagen-4.0-fast-generate-001', label: 'Imagen 4 Fast' },
  ],
}

export const PROVIDER_DISPLAY: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  gemini: 'Google',
}

export function resolveTextProvider(modelId: string): string {
  for (const [provider, models] of Object.entries(TEXT_MODELS)) {
    if (models.some((m) => m.id === modelId)) return provider
  }
  throw new Error(`Unknown text model: ${modelId}`)
}

export function resolveImageProvider(modelId: string): string {
  for (const [provider, models] of Object.entries(IMAGE_MODELS)) {
    if (models.some((m) => m.id === modelId)) return provider
  }
  throw new Error(`Unknown image model: ${modelId}`)
}

export function getAllTextModels(): Array<ModelOption & { provider: string }> {
  return Object.entries(TEXT_MODELS).flatMap(([provider, models]) =>
    models.map((m) => ({ ...m, provider }))
  )
}

export function getAllImageModels(): Array<ModelOption & { provider: string }> {
  return Object.entries(IMAGE_MODELS).flatMap(([provider, models]) =>
    models.map((m) => ({ ...m, provider }))
  )
}

export function getDefaultTextModel(): string {
  for (const models of Object.values(TEXT_MODELS)) {
    const def = models.find((m) => m.default)
    if (def) return def.id
  }
  throw new Error('No default text model configured')
}

export function getDefaultImageModel(): string {
  for (const models of Object.values(IMAGE_MODELS)) {
    const def = models.find((m) => m.default)
    if (def) return def.id
  }
  throw new Error('No default image model configured')
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/__tests__/models.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/models.ts src/lib/__tests__/models.test.ts
git commit -m "feat: add static model registry for text and image providers"
```

---

### Task 2: Add GroupedSelect Component

**Files:**
- Modify: `src/components/ui/select.tsx` (add GroupedSelect export)
- Modify: `src/components/ui/index.ts` (re-export GroupedSelect)

**Step 1: Write the implementation**

Add a new `GroupedSelect` component to `src/components/ui/select.tsx` that renders `<optgroup>` elements. Keep the existing `Select` unchanged.

```typescript
// Add to src/components/ui/select.tsx after existing Select component

export interface SelectOptionGroup {
  label: string
  options: SelectOption[]
}

interface GroupedSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  groups: SelectOptionGroup[]
  error?: string
}

export const GroupedSelect = forwardRef<HTMLSelectElement, GroupedSelectProps>(
  ({ className = '', label, groups, error, id, ...props }, ref) => {
    const generatedId = useId()
    const selectId = id ?? generatedId
    const errorId = `${selectId}-error`

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
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={`w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${error ? 'border-red-500' : ''} ${className}`}
          {...props}
        >
          {groups.map((group) => (
            <optgroup key={group.label} label={group.label}>
              {group.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        {error && <p id={errorId} className="mt-1 text-sm text-red-400">{error}</p>}
      </div>
    )
  }
)

GroupedSelect.displayName = 'GroupedSelect'
```

Also export from `src/components/ui/index.ts`:
```typescript
export { GroupedSelect } from './select'
// alongside existing: export { Select } from './select'
```

**Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: No type errors

**Step 3: Commit**

```bash
git add src/components/ui/select.tsx src/components/ui/index.ts
git commit -m "feat: add GroupedSelect component with optgroup support"
```

---

### Task 3: Update Schema to Accept Model Fields

**Files:**
- Modify: `src/lib/schemas/generation-options.ts`

**Step 1: Write the failing test**

There are no existing tests for generation-options schema. Add a focused test:

```typescript
// src/lib/schemas/__tests__/generation-options.test.ts
import { describe, it, expect } from 'vitest'
import { generationOptionsSchema } from '../generation-options'

describe('generationOptionsSchema', () => {
  it('accepts options without model fields (backward compat)', () => {
    const result = generationOptionsSchema.parse({ ruleset: 'dnd5e', style: 'fantasy_art' })
    expect(result.textModel).toBeUndefined()
    expect(result.imageModel).toBeUndefined()
  })

  it('accepts options with textModel', () => {
    const result = generationOptionsSchema.parse({
      ruleset: 'dnd5e',
      style: 'fantasy_art',
      textModel: 'gpt-5.2',
    })
    expect(result.textModel).toBe('gpt-5.2')
  })

  it('accepts options with imageModel', () => {
    const result = generationOptionsSchema.parse({
      ruleset: 'dnd5e',
      style: 'fantasy_art',
      imageModel: 'gpt-image-1',
    })
    expect(result.imageModel).toBe('gpt-image-1')
  })

  it('accepts options with both model fields', () => {
    const result = generationOptionsSchema.parse({
      ruleset: 'dnd5e',
      style: 'fantasy_art',
      textModel: 'claude-sonnet-4-6',
      imageModel: 'gemini-2.5-flash-image',
    })
    expect(result.textModel).toBe('claude-sonnet-4-6')
    expect(result.imageModel).toBe('gemini-2.5-flash-image')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/schemas/__tests__/generation-options.test.ts`
Expected: FAIL — textModel/imageModel not recognized or stripped by schema

**Step 3: Write implementation**

Modify `src/lib/schemas/generation-options.ts` — add two optional string fields:

```typescript
// Add to generationOptionsSchema object:
  textModel: z.string().optional(),
  imageModel: z.string().optional(),
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/schemas/__tests__/generation-options.test.ts`
Expected: PASS

**Step 5: Run all existing tests**

Run: `npx vitest run`
Expected: All tests PASS (schema change is additive/optional)

**Step 6: Commit**

```bash
git add src/lib/schemas/generation-options.ts src/lib/schemas/__tests__/generation-options.test.ts
git commit -m "feat: add textModel and imageModel fields to generation options schema"
```

---

### Task 4: Refactor Text Provider Factories to Accept Model Parameter

**Files:**
- Modify: `src/lib/providers/text/openai.ts`
- Modify: `src/lib/providers/text/anthropic.ts`
- Modify: `src/lib/providers/text/index.ts`
- Modify: `src/lib/providers/types.ts`

**Step 1: Update provider types**

In `src/lib/providers/types.ts`, add `'gemini'` to `TextProviderType`:

```typescript
export type TextProviderType = 'openai' | 'anthropic' | 'gemini'
```

**Step 2: Refactor OpenAI text provider**

In `src/lib/providers/text/openai.ts`:
- Change `const MODEL = 'gpt-4o'` to a default parameter
- Add `model` parameter to `createOpenAITextProvider(model?: string)`
- Use `model ?? 'gpt-5.2'` throughout (update default from gpt-4o to gpt-5.2)

```typescript
const DEFAULT_MODEL = 'gpt-5.2'

export function createOpenAITextProvider(model?: string): TextProvider {
  if (!env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured')
  }

  const activeModel = model ?? DEFAULT_MODEL
  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY })

  return {
    async generateWeapon(prompt: string, options: GenerationOptions): Promise<TextGenerationResult> {
      // ... same logic but use `activeModel` instead of `MODEL`
    },
  }
}
```

Also update `attemptRepair` to accept model parameter.

**Step 3: Refactor Anthropic text provider**

In `src/lib/providers/text/anthropic.ts`:
- Same pattern: add `model?: string` parameter
- Default to `'claude-sonnet-4-6'` (update from older model)

```typescript
const DEFAULT_MODEL = 'claude-sonnet-4-6'

export function createAnthropicTextProvider(model?: string): TextProvider {
  const activeModel = model ?? DEFAULT_MODEL
  // ... same logic with activeModel
}
```

**Step 4: Refactor text provider factory**

In `src/lib/providers/text/index.ts`:
- Remove singleton pattern
- Accept optional `modelId` parameter
- Use `resolveTextProvider` from models.ts when modelId provided

```typescript
import { env } from '@/lib/env'
import { resolveTextProvider } from '@/lib/models'
import { createOpenAITextProvider } from './openai'
import { createAnthropicTextProvider } from './anthropic'
import { createGeminiTextProvider } from './gemini'
import type { TextProvider, TextProviderType } from '../types'

export function getTextProvider(modelId?: string): TextProvider {
  if (modelId) {
    const providerType = resolveTextProvider(modelId) as TextProviderType
    return createTextProvider(providerType, modelId)
  }
  return createTextProvider(env.TEXT_PROVIDER as TextProviderType)
}

function createTextProvider(type: TextProviderType, model?: string): TextProvider {
  switch (type) {
    case 'openai':
      return createOpenAITextProvider(model)
    case 'anthropic':
      return createAnthropicTextProvider(model)
    case 'gemini':
      return createGeminiTextProvider(model)
    default:
      throw new Error(`Unknown text provider: ${type}`)
  }
}
```

**Step 5: Verify type checking**

Run: `npx tsc --noEmit`
Expected: No errors (gemini provider doesn't exist yet, will be added in Task 5)

Note: This step may have a type error until Task 5 is completed. If so, add a temporary stub or complete Task 5 first.

**Step 6: Run existing tests**

Run: `npx vitest run`
Expected: All tests PASS

**Step 7: Commit**

```bash
git add src/lib/providers/text/openai.ts src/lib/providers/text/anthropic.ts src/lib/providers/text/index.ts src/lib/providers/types.ts
git commit -m "refactor: text provider factories accept model parameter, remove singleton"
```

---

### Task 5: Create Gemini Text Provider

**Files:**
- Create: `src/lib/providers/text/gemini.ts`

**Step 1: Write the implementation**

```typescript
// src/lib/providers/text/gemini.ts
import 'server-only'
import { GoogleGenAI } from '@google/genai'
import { env } from '@/lib/env'
import { textGenerationResultSchema } from '@/lib/schemas'
import { buildWeaponPrompt, buildRepairPrompt, stripCodeFences } from '../prompts'
import type { TextProvider, TextGenerationResult } from '../types'
import type { GenerationOptions } from '@/lib/schemas'

const DEFAULT_MODEL = 'gemini-2.5-flash'

export function createGeminiTextProvider(model?: string): TextProvider {
  if (!env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured')
  }

  const activeModel = model ?? DEFAULT_MODEL
  const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY })

  return {
    async generateWeapon(prompt: string, options: GenerationOptions): Promise<TextGenerationResult> {
      const weaponPrompt = buildWeaponPrompt(prompt, options)

      const response = await ai.models.generateContent({
        model: activeModel,
        contents: weaponPrompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.8,
          maxOutputTokens: 2000,
          systemInstruction: 'You are a fantasy RPG game designer. Always respond with valid JSON only.',
        },
      })

      const content = response.text
      if (!content) {
        throw new Error('No content in Gemini response')
      }

      let parsed: unknown
      try {
        parsed = JSON.parse(stripCodeFences(content))
      } catch {
        parsed = await attemptRepair(ai, activeModel, content, 'Invalid JSON syntax')
      }

      const validated = textGenerationResultSchema.safeParse(parsed)
      if (!validated.success) {
        const errorMsg = validated.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')
        parsed = await attemptRepair(ai, activeModel, content, errorMsg)

        const revalidated = textGenerationResultSchema.safeParse(parsed)
        if (!revalidated.success) {
          throw new Error(`Schema validation failed after repair: ${revalidated.error.message}`)
        }

        return {
          weaponSpec: revalidated.data.weaponSpec,
          descriptionMd: revalidated.data.descriptionMd,
          model: activeModel,
        }
      }

      return {
        weaponSpec: validated.data.weaponSpec,
        descriptionMd: validated.data.descriptionMd,
        model: activeModel,
      }
    },
  }
}

async function attemptRepair(ai: GoogleGenAI, model: string, invalidJson: string, error: string): Promise<unknown> {
  const repairPrompt = buildRepairPrompt(invalidJson, error)

  const response = await ai.models.generateContent({
    model,
    contents: repairPrompt,
    config: {
      responseMimeType: 'application/json',
      temperature: 0,
      maxOutputTokens: 2000,
      systemInstruction: 'You fix JSON errors. Return only valid JSON.',
    },
  })

  const content = response.text
  if (!content) {
    throw new Error('No content in Gemini repair response')
  }

  return JSON.parse(stripCodeFences(content))
}
```

**Step 2: Check that `stripCodeFences` is exported from prompts**

Verify `src/lib/providers/prompts/index.ts` exports `stripCodeFences`. If not, add the export.

**Step 3: Update env schema**

In `src/lib/env.ts`, add `'gemini'` to TEXT_PROVIDER enum:

```typescript
TEXT_PROVIDER: z.enum(['openai', 'anthropic', 'gemini']).default('openai'),
```

**Step 4: Verify type checking**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 5: Run all tests**

Run: `npx vitest run`
Expected: All PASS

**Step 6: Commit**

```bash
git add src/lib/providers/text/gemini.ts src/lib/env.ts
git commit -m "feat: add Gemini text generation provider"
```

---

### Task 6: Refactor Image Provider Factories to Accept Model Parameter

**Files:**
- Modify: `src/lib/providers/image/openai.ts`
- Modify: `src/lib/providers/image/gemini.ts`
- Modify: `src/lib/providers/image/index.ts`

**Step 1: Refactor OpenAI image provider**

In `src/lib/providers/image/openai.ts`:
- Add `model?: string` parameter
- Default to `'gpt-image-1'` (migrating from dall-e-3)
- Note: gpt-image-* models may need different API parameters than dall-e-3. Verify `response_format` and `size` support. If they differ, branch on model name.

```typescript
const DEFAULT_MODEL = 'gpt-image-1'

export function createOpenAIImageProvider(model?: string): ImageProvider {
  const activeModel = model ?? DEFAULT_MODEL
  // ... same logic with activeModel
}
```

**Step 2: Refactor Gemini image provider**

In `src/lib/providers/image/gemini.ts`:
- Add `model?: string` parameter
- Default to `'gemini-2.5-flash-image'`

```typescript
const DEFAULT_MODEL = 'gemini-2.5-flash-image'

export function createGeminiImageProvider(model?: string): ImageProvider {
  const activeModel = model ?? DEFAULT_MODEL
  // ... same logic with activeModel
}
```

**Step 3: Refactor image provider factory**

In `src/lib/providers/image/index.ts`:
- Remove singleton pattern
- Accept optional `modelId` parameter
- Use `resolveImageProvider` from models.ts

```typescript
import { resolveImageProvider } from '@/lib/models'

export function getImageProvider(modelId?: string): ImageProvider {
  if (modelId) {
    const providerType = resolveImageProvider(modelId) as ImageProviderType
    return createImageProvider(providerType, modelId)
  }
  return createImageProvider(env.IMAGE_PROVIDER as ImageProviderType)
}

function createImageProvider(type: ImageProviderType, model?: string): ImageProvider {
  switch (type) {
    case 'openai':
      return createOpenAIImageProvider(model)
    case 'gemini':
      return createGeminiImageProvider(model)
    default:
      throw new Error(`Unknown image provider: ${type}`)
  }
}
```

**Step 4: Run tests**

Run: `npx vitest run`
Expected: All PASS

**Step 5: Commit**

```bash
git add src/lib/providers/image/openai.ts src/lib/providers/image/gemini.ts src/lib/providers/image/index.ts
git commit -m "refactor: image provider factories accept model parameter, remove singleton"
```

---

### Task 7: Update Orchestrator to Pass Model from Options

**Files:**
- Modify: `src/lib/generation/orchestrator.ts`

**Step 1: Update `generateWeapon`**

Change lines that call `getTextProvider()` and `getImageProvider()` to pass the model from options:

```typescript
// Line ~26-27: was getTextProvider(), now:
const textProvider = getTextProvider(options.textModel)

// Line ~50: was getImageProvider(), now:
const imageProvider = getImageProvider(options.imageModel)
```

**Step 2: Update `regenerateImage`**

Also pass model from stored options:

```typescript
// Line ~115: was getImageProvider(), now:
const imageProvider = getImageProvider(options.imageModel)
```

**Step 3: Update `rerollWeapon`**

No changes needed — it calls `generateWeapon` which now reads from options.

**Step 4: Run existing tests**

Run: `npx vitest run`
Expected: All PASS (orchestrator tests mock the providers module entirely)

**Step 5: Commit**

```bash
git add src/lib/generation/orchestrator.ts
git commit -m "feat: orchestrator passes model selection from options to providers"
```

---

### Task 8: Update Weapon Form with Model Selectors

**Files:**
- Modify: `src/components/weapon-form.tsx`

**Step 1: Add model selector UI**

Import `GroupedSelect` and model data. Add two state variables and dropdowns:

```typescript
import { Button, Select, GroupedSelect, Card, CardContent, CardFooter } from './ui'
import { RULESET_DISPLAY, STYLE_DISPLAY, RARITY_DISPLAY } from '@/lib/schemas'
import { TEXT_MODELS, IMAGE_MODELS, PROVIDER_DISPLAY, getDefaultTextModel, getDefaultImageModel } from '@/lib/models'

// Build grouped options for selects
const textModelGroups = Object.entries(TEXT_MODELS).map(([provider, models]) => ({
  label: PROVIDER_DISPLAY[provider] ?? provider,
  options: models.map((m) => ({ value: m.id, label: m.label })),
}))

const imageModelGroups = Object.entries(IMAGE_MODELS).map(([provider, models]) => ({
  label: PROVIDER_DISPLAY[provider] ?? provider,
  options: models.map((m) => ({ value: m.id, label: m.label })),
}))

// Inside WeaponForm component, add state:
const [textModel, setTextModel] = useState(getDefaultTextModel())
const [imageModel, setImageModel] = useState(getDefaultImageModel())

// In handleSubmit, add to options:
body: JSON.stringify({
  prompt,
  options: {
    ruleset,
    style,
    ...(rarity && { rarity }),
    textModel,
    imageModel,
  },
}),

// In JSX, after the existing grid-cols-3 div, add:
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
```

**Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Manual verification**

Run: `npm run dev`
Visit `http://localhost:3000` — verify:
- Two new dropdowns appear below the ruleset/style/rarity row
- Models are grouped by provider with optgroup labels
- Defaults are pre-selected (GPT-5.2 for text, GPT Image 1 for image)

**Step 4: Commit**

```bash
git add src/components/weapon-form.tsx
git commit -m "feat: add text and image model selection dropdowns to weapon form"
```

---

### Task 9: Update Provider Barrel Exports

**Files:**
- Modify: `src/lib/providers/index.ts`

**Step 1: Update exports**

Remove `resetTextProvider` and `resetImageProvider` exports (singleton is gone). Add Gemini text provider to the barrel if needed. Ensure `getTextProvider` and `getImageProvider` signatures are updated.

Check if any test files import `resetTextProvider` or `resetImageProvider` — if so, remove those calls (they're no-ops now since there's no singleton).

**Step 2: Run all tests**

Run: `npx vitest run`
Expected: All PASS

**Step 3: Commit**

```bash
git add src/lib/providers/index.ts
git commit -m "chore: update provider barrel exports for per-request model selection"
```

---

### Task 10: End-to-End Verification

**Step 1: Run full test suite**

Run: `npx vitest run`
Expected: All tests PASS

**Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Manual smoke test**

Run: `npm run dev`
1. Open form, select different text/image models
2. Generate a weapon — verify it completes
3. Check weapon detail page — `textModel` and `imageModel` fields should show the selected models
4. Try "Reroll Stats" — should use models from stored options
5. Try "New Image" — should use image model from stored options

**Step 4: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: address issues found during model selection smoke test"
```
