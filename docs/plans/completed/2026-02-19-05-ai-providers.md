# Component 5: AI Providers Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create swappable AI provider interfaces for text generation (weapon stats/description) and image generation (weapon artwork).

**Architecture:** Provider interface pattern with factory functions. Each provider implements a common interface, selected by environment variable. Prompts are extracted to separate modules for maintainability.

**Tech Stack:** OpenAI SDK, Anthropic SDK, Google GenAI SDK

**Prerequisites:** Components 1 (Core Infrastructure — `src/lib/env.ts`) and 3 (Weapon Spec Schema — `src/lib/schemas`) must be completed first.

---

## Task 1: Install AI Provider SDKs

**Files:**
- Modify: `package.json`

**Step 1: Install OpenAI SDK**

Run:
```bash
npm install openai
```

Expected: openai added to dependencies.

**Step 2: Install Anthropic SDK**

Run:
```bash
npm install @anthropic-ai/sdk
```

Expected: @anthropic-ai/sdk added to dependencies.

**Step 3: Install Google GenAI SDK**

Run:
```bash
npm install @google/genai
```

Expected: @google/genai added to dependencies.

**Step 4: Commit**

Run:
```bash
git add package.json package-lock.json && git commit -m "chore: install AI provider SDKs"
```

---

## Task 2: Create Provider Type Definitions

**Files:**
- Create: `src/lib/providers/types.ts`

**Step 1: Create provider interfaces**

Create file `src/lib/providers/types.ts`:

```typescript
import type { GenerationOptions, WeaponSpec } from '@/lib/schemas'

export interface TextGenerationResult {
  weaponSpec: WeaponSpec
  descriptionMd: string
  model: string
}

export interface TextProvider {
  generateWeapon(prompt: string, options: GenerationOptions): Promise<TextGenerationResult>
}

export interface ImageGenerationResult {
  imageData: Buffer
  mimeType: string
  model: string
  revisedPrompt?: string
}

export interface ImageProvider {
  generateImage(prompt: string): Promise<ImageGenerationResult>
}

export type TextProviderType = 'openai' | 'anthropic'
export type ImageProviderType = 'openai' | 'gemini'
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
git add src/lib/providers/types.ts && git commit -m "feat: add AI provider type definitions"
```

---

## Task 3: Create Weapon Generation Prompt

**Files:**
- Create: `src/lib/providers/prompts/weapon-generation.ts`

**Step 0: Create directory**

Run:
```bash
mkdir -p src/lib/providers/prompts
```

**Step 1: Create weapon generation prompt template**

Create file `src/lib/providers/prompts/weapon-generation.ts`:

```typescript
import { WEAPON_SPEC_SCHEMA_DESCRIPTION } from '@/lib/schemas'
import type { GenerationOptions } from '@/lib/schemas'

export function buildWeaponPrompt(userPrompt: string, options: GenerationOptions): string {
  const rulesetInstructions = getRulesetInstructions(options.ruleset)
  const rarityInstruction = options.rarity
    ? `The weapon should be of ${options.rarity.replace('_', ' ')} rarity.`
    : 'Choose an appropriate rarity based on the concept.'

  return `You are a fantasy game designer creating a magical weapon for a tabletop RPG.

USER'S CONCEPT:
${userPrompt}

REQUIREMENTS:
- ${rulesetInstructions}
- ${rarityInstruction}
- Create a balanced, interesting weapon that fits the concept
- Include evocative flavor text that tells a story
- Effects should be mechanically clear and balanced for the rarity

OUTPUT FORMAT:
Return a JSON object with exactly this structure:
{
  "weaponSpec": ${WEAPON_SPEC_SCHEMA_DESCRIPTION},
  "descriptionMd": "Markdown formatted flavor text (2-4 paragraphs). Include the weapon's history, appearance, and any legends associated with it. Use headers and formatting for readability."
}

IMPORTANT:
- Return ONLY valid JSON, no other text
- All string values must be properly escaped
- The rulesText should be complete and self-contained
- Tags should be lowercase, single words or short phrases`
}

function getRulesetInstructions(ruleset: string): string {
  switch (ruleset) {
    case 'dnd5e':
      return 'Use D&D 5th Edition rules. Damage dice, properties, and bonuses should match 5e conventions. Reference PHB/DMG item formats.'
    case 'pathfinder2e':
      return 'Use Pathfinder 2e rules. Include appropriate traits, damage dice, and activation requirements per PF2e conventions.'
    case 'generic':
    default:
      return 'Use generic fantasy RPG conventions. Keep mechanics simple and adaptable to various systems.'
  }
}

export function buildRepairPrompt(invalidJson: string, error: string): string {
  return `The following JSON is invalid and needs to be fixed:

\`\`\`json
${invalidJson}
\`\`\`

ERROR: ${error}

Please fix the JSON and return ONLY the corrected JSON object. Ensure:
1. All strings are properly escaped
2. All required fields are present
3. The structure matches the expected schema exactly
4. No trailing commas
5. No comments

Return ONLY the fixed JSON, nothing else.`
}

/**
 * Strip markdown code fences from LLM output.
 * Some models wrap JSON in ```json ... ``` blocks.
 */
export function stripCodeFences(text: string): string {
  let content = text.trim()
  if (content.startsWith('```json')) {
    content = content.slice(7)
  } else if (content.startsWith('```')) {
    content = content.slice(3)
  }
  if (content.endsWith('```')) {
    content = content.slice(0, -3)
  }
  return content.trim()
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
git add src/lib/providers/prompts/weapon-generation.ts && git commit -m "feat: add weapon generation prompt template"
```

---

## Task 4: Create Image Generation Prompt

**Files:**
- Create: `src/lib/providers/prompts/image-generation.ts`

**Step 1: Create image prompt builder**

Create file `src/lib/providers/prompts/image-generation.ts`:

```typescript
import type { WeaponSpec, Style } from '@/lib/schemas'

export function buildImagePrompt(weaponSpec: WeaponSpec, style: Style): string {
  const styleInstructions = getStyleInstructions(style)
  const weaponDescription = buildWeaponDescription(weaponSpec)

  return `${styleInstructions}

A detailed illustration of a fantasy weapon: ${weaponDescription}

The weapon should be shown on a neutral background, centered in frame, with dramatic lighting that highlights its magical properties. High detail, professional quality artwork.`
}

function getStyleInstructions(style: Style): string {
  switch (style) {
    case 'realistic':
      return 'Photorealistic digital art style, detailed textures, dramatic studio lighting.'
    case 'fantasy_art':
      return 'Classic fantasy art style, rich colors, painterly quality, reminiscent of MTG or D&D artwork.'
    case 'dark_fantasy':
      return 'Dark fantasy art style, moody atmosphere, deep shadows, ominous lighting, gothic influences.'
    case 'anime':
      return 'Anime/manga art style, clean lines, vibrant colors, cel-shaded appearance.'
    case 'pixel_art':
      return '16-bit pixel art style, retro game aesthetic, limited color palette, clear silhouette.'
    case 'watercolor':
      return 'Watercolor painting style, soft edges, flowing colors, artistic and ethereal.'
    default:
      return 'High quality fantasy illustration.'
  }
}

function buildWeaponDescription(spec: WeaponSpec): string {
  const parts: string[] = []

  // Basic type and rarity
  parts.push(`a ${spec.rarity.replace('_', ' ')} ${spec.weaponType} called "${spec.name}"`)

  // Damage type hints at appearance
  if (spec.damage.type !== 'slashing' && spec.damage.type !== 'piercing' && spec.damage.type !== 'bludgeoning') {
    parts.push(`with ${spec.damage.type} magical energy`)
  }

  // Effects suggest visual elements
  const visualEffects = spec.effects
    .filter((e) => e.trigger === 'passive' || e.trigger === 'on_hit')
    .map((e) => e.description)
    .slice(0, 2)

  if (visualEffects.length > 0) {
    parts.push(`featuring ${visualEffects.join(' and ')}`)
  }

  // Tags can add flavor
  const visualTags = spec.tags.filter((t) =>
    ['glowing', 'ancient', 'crystalline', 'ornate', 'runic', 'ethereal', 'flame', 'frost', 'shadow', 'light'].some(
      (v) => t.includes(v)
    )
  )
  if (visualTags.length > 0) {
    parts.push(`(${visualTags.join(', ')})`)
  }

  return parts.join(', ')
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
git add src/lib/providers/prompts/image-generation.ts && git commit -m "feat: add image generation prompt builder"
```

---

## Task 5: Create Prompts Index

**Files:**
- Create: `src/lib/providers/prompts/index.ts`

**Step 1: Create prompts index**

Create file `src/lib/providers/prompts/index.ts`:

```typescript
export { buildWeaponPrompt, buildRepairPrompt, stripCodeFences } from './weapon-generation'
export { buildImagePrompt } from './image-generation'
```

**Step 2: Commit**

Run:
```bash
git add src/lib/providers/prompts/index.ts && git commit -m "feat: add prompts index"
```

---

## Task 6: Create OpenAI Text Provider

**Files:**
- Create: `src/lib/providers/text/openai.ts`

**Step 0: Create directory**

Run:
```bash
mkdir -p src/lib/providers/text
```

**Step 1: Create OpenAI text provider**

Create file `src/lib/providers/text/openai.ts`:

```typescript
import 'server-only'
import OpenAI from 'openai'
import { env } from '@/lib/env'
import { textGenerationResultSchema } from '@/lib/schemas'
import { buildWeaponPrompt, buildRepairPrompt } from '../prompts'
import type { TextProvider, TextGenerationResult } from '../types'
import type { GenerationOptions } from '@/lib/schemas'

const MODEL = 'gpt-4o'

export function createOpenAITextProvider(): TextProvider {
  if (!env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured')
  }

  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY })

  return {
    async generateWeapon(prompt: string, options: GenerationOptions): Promise<TextGenerationResult> {
      const weaponPrompt = buildWeaponPrompt(prompt, options)

      const response = await client.chat.completions.create({
        model: MODEL,
        messages: [
          { role: 'system', content: 'You are a fantasy RPG game designer. Always respond with valid JSON only.' },
          { role: 'user', content: weaponPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.8,
        max_tokens: 2000,
      })

      const content = response.choices[0]?.message?.content
      if (!content) {
        throw new Error('No content in OpenAI response')
      }

      // Parse and validate JSON
      let parsed: unknown
      try {
        parsed = JSON.parse(content)
      } catch {
        // Try to repair with a follow-up call
        parsed = await attemptRepair(client, content, 'Invalid JSON syntax')
      }

      const validated = textGenerationResultSchema.safeParse(parsed)
      if (!validated.success) {
        // Try to repair with schema errors
        const errorMsg = validated.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')
        parsed = await attemptRepair(client, content, errorMsg)

        const revalidated = textGenerationResultSchema.safeParse(parsed)
        if (!revalidated.success) {
          throw new Error(`Schema validation failed after repair: ${revalidated.error.message}`)
        }

        return {
          weaponSpec: revalidated.data.weaponSpec,
          descriptionMd: revalidated.data.descriptionMd,
          model: MODEL,
        }
      }

      return {
        weaponSpec: validated.data.weaponSpec,
        descriptionMd: validated.data.descriptionMd,
        model: MODEL,
      }
    },
  }
}

async function attemptRepair(client: OpenAI, invalidJson: string, error: string): Promise<unknown> {
  const repairPrompt = buildRepairPrompt(invalidJson, error)

  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: 'You fix JSON errors. Return only valid JSON.' },
      { role: 'user', content: repairPrompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0,
    max_tokens: 2000,
  })

  const content = response.choices[0]?.message?.content
  if (!content) {
    throw new Error('No content in repair response')
  }

  return JSON.parse(content)
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
git add src/lib/providers/text/openai.ts && git commit -m "feat: add OpenAI text provider"
```

---

## Task 7: Create Anthropic Text Provider

**Files:**
- Create: `src/lib/providers/text/anthropic.ts`

**Step 1: Create Anthropic text provider**

Create file `src/lib/providers/text/anthropic.ts`:

```typescript
import 'server-only'
import Anthropic from '@anthropic-ai/sdk'
import { env } from '@/lib/env'
import { textGenerationResultSchema } from '@/lib/schemas'
import { buildWeaponPrompt, buildRepairPrompt, stripCodeFences } from '../prompts'
import type { TextProvider, TextGenerationResult } from '../types'
import type { GenerationOptions } from '@/lib/schemas'

const MODEL = 'claude-sonnet-4-20250514'

export function createAnthropicTextProvider(): TextProvider {
  if (!env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not configured')
  }

  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })

  return {
    async generateWeapon(prompt: string, options: GenerationOptions): Promise<TextGenerationResult> {
      const userPrompt = buildWeaponPrompt(prompt, options)

      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 2000,
        messages: [{ role: 'user', content: userPrompt }],
        system:
          'You are a fantasy RPG game designer. Always respond with valid JSON only, no other text or markdown formatting.',
      })

      const textBlock = response.content.find((block) => block.type === 'text')
      if (!textBlock || textBlock.type !== 'text') {
        throw new Error('No text content in Anthropic response')
      }

      const content = stripCodeFences(textBlock.text)

      // Parse and validate JSON
      let parsed: unknown
      try {
        parsed = JSON.parse(content)
      } catch {
        parsed = await attemptRepair(client, content, 'Invalid JSON syntax')
      }

      const validated = textGenerationResultSchema.safeParse(parsed)
      if (!validated.success) {
        const errorMsg = validated.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')
        parsed = await attemptRepair(client, content, errorMsg)

        const revalidated = textGenerationResultSchema.safeParse(parsed)
        if (!revalidated.success) {
          throw new Error(`Schema validation failed after repair: ${revalidated.error.message}`)
        }

        return {
          weaponSpec: revalidated.data.weaponSpec,
          descriptionMd: revalidated.data.descriptionMd,
          model: MODEL,
        }
      }

      return {
        weaponSpec: validated.data.weaponSpec,
        descriptionMd: validated.data.descriptionMd,
        model: MODEL,
      }
    },
  }
}

async function attemptRepair(client: Anthropic, invalidJson: string, error: string): Promise<unknown> {
  const repairPrompt = buildRepairPrompt(invalidJson, error)

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2000,
    messages: [{ role: 'user', content: repairPrompt }],
    system: 'You fix JSON errors. Return only valid JSON, no other text.',
  })

  const textBlock = response.content.find((block) => block.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text content in repair response')
  }

  return JSON.parse(stripCodeFences(textBlock.text))
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
git add src/lib/providers/text/anthropic.ts && git commit -m "feat: add Anthropic text provider"
```

---

## Task 8: Create Text Provider Factory

**Files:**
- Create: `src/lib/providers/text/index.ts`

**Step 1: Create text provider factory**

Create file `src/lib/providers/text/index.ts`:

```typescript
import { env } from '@/lib/env'
import { createOpenAITextProvider } from './openai'
import { createAnthropicTextProvider } from './anthropic'
import type { TextProvider, TextProviderType } from '../types'

let textProvider: TextProvider | null = null

export function getTextProvider(): TextProvider {
  if (!textProvider) {
    textProvider = createTextProvider(env.TEXT_PROVIDER as TextProviderType)
  }
  return textProvider
}

function createTextProvider(type: TextProviderType): TextProvider {
  switch (type) {
    case 'openai':
      return createOpenAITextProvider()
    case 'anthropic':
      return createAnthropicTextProvider()
    default:
      throw new Error(`Unknown text provider: ${type}`)
  }
}

// For testing
export function resetTextProvider(): void {
  textProvider = null
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
git add src/lib/providers/text/index.ts && git commit -m "feat: add text provider factory"
```

---

## Task 9: Create OpenAI Image Provider

**Files:**
- Create: `src/lib/providers/image/openai.ts`

**Step 0: Create directory**

Run:
```bash
mkdir -p src/lib/providers/image
```

**Step 1: Create OpenAI image provider**

Create file `src/lib/providers/image/openai.ts`:

```typescript
import 'server-only'
import OpenAI from 'openai'
import { env } from '@/lib/env'
import type { ImageProvider, ImageGenerationResult } from '../types'

const MODEL = 'dall-e-3'

export function createOpenAIImageProvider(): ImageProvider {
  if (!env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured')
  }

  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY })

  return {
    async generateImage(prompt: string): Promise<ImageGenerationResult> {
      const response = await client.images.generate({
        model: MODEL,
        prompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard',
        response_format: 'b64_json',
      })

      const imageData = response.data[0]
      if (!imageData?.b64_json) {
        throw new Error('No image data in OpenAI response')
      }

      return {
        imageData: Buffer.from(imageData.b64_json, 'base64'),
        mimeType: 'image/png',
        model: MODEL,
        revisedPrompt: imageData.revised_prompt,
      }
    },
  }
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
git add src/lib/providers/image/openai.ts && git commit -m "feat: add OpenAI image provider"
```

---

## Task 10: Create Gemini Image Provider

**Files:**
- Create: `src/lib/providers/image/gemini.ts`

**Step 1: Create Gemini image provider**

Create file `src/lib/providers/image/gemini.ts`:

```typescript
import 'server-only'
import { GoogleGenAI } from '@google/genai'
import { env } from '@/lib/env'
import type { ImageProvider, ImageGenerationResult } from '../types'

const MODEL = 'gemini-2.5-flash-image'

export function createGeminiImageProvider(): ImageProvider {
  if (!env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured')
  }

  const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY })

  return {
    async generateImage(prompt: string): Promise<ImageGenerationResult> {
      const response = await ai.models.generateContent({
        model: MODEL,
        contents: prompt,
      })

      // Find image part in response
      const imagePart = response.candidates?.[0]?.content?.parts?.find(
        (part) => part.inlineData?.mimeType?.startsWith('image/')
      )

      if (!imagePart?.inlineData?.data) {
        throw new Error('No image data in Gemini response')
      }

      return {
        imageData: Buffer.from(imagePart.inlineData.data, 'base64'),
        mimeType: imagePart.inlineData.mimeType ?? 'image/png',
        model: MODEL,
      }
    },
  }
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
git add src/lib/providers/image/gemini.ts && git commit -m "feat: add Gemini image provider"
```

---

## Task 11: Create Image Provider Factory

**Files:**
- Create: `src/lib/providers/image/index.ts`

**Step 1: Create image provider factory**

Create file `src/lib/providers/image/index.ts`:

```typescript
import { env } from '@/lib/env'
import { createOpenAIImageProvider } from './openai'
import { createGeminiImageProvider } from './gemini'
import type { ImageProvider, ImageProviderType } from '../types'

let imageProvider: ImageProvider | null = null

export function getImageProvider(): ImageProvider {
  if (!imageProvider) {
    imageProvider = createImageProvider(env.IMAGE_PROVIDER as ImageProviderType)
  }
  return imageProvider
}

function createImageProvider(type: ImageProviderType): ImageProvider {
  switch (type) {
    case 'openai':
      return createOpenAIImageProvider()
    case 'gemini':
      return createGeminiImageProvider()
    default:
      throw new Error(`Unknown image provider: ${type}`)
  }
}

// For testing
export function resetImageProvider(): void {
  imageProvider = null
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
git add src/lib/providers/image/index.ts && git commit -m "feat: add image provider factory"
```

---

## Task 12: Create Providers Index

**Files:**
- Create: `src/lib/providers/index.ts`

**Step 1: Create providers index**

Create file `src/lib/providers/index.ts`:

```typescript
// Types
export type {
  TextProvider,
  ImageProvider,
  TextGenerationResult,
  ImageGenerationResult,
  TextProviderType,
  ImageProviderType,
} from './types'

// Factories
export { getTextProvider, resetTextProvider } from './text'
export { getImageProvider, resetImageProvider } from './image'

// Prompts
export { buildWeaponPrompt, buildRepairPrompt, buildImagePrompt } from './prompts'
```

**Step 2: Remove .gitkeep**

Run:
```bash
rm -f src/lib/providers/.gitkeep
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
git add src/lib/providers/index.ts && git rm -f --ignore-unmatch src/lib/providers/.gitkeep && git commit -m "feat: add providers index"
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

**Step 2: Run tests**

Run:
```bash
npm run test:run
```

Expected: All tests pass.

**Step 3: Final commit**

Run:
```bash
git commit --allow-empty -m "chore: complete AI providers component"
```

---

## Component 5 Complete

**Summary of what was created:**
- Provider type definitions (TextProvider, ImageProvider interfaces)
- Weapon generation prompt template with ruleset support
- Image generation prompt builder with style support
- OpenAI text provider (gpt-4o with JSON mode)
- Anthropic text provider (claude-sonnet-4-20250514)
- JSON repair logic for schema validation failures
- OpenAI image provider (dall-e-3)
- Gemini image provider (gemini-2.5-flash-image)
- Provider factory functions with env var selection

**Key Usage:**
```typescript
import { getTextProvider, getImageProvider, buildImagePrompt } from '@/lib/providers'

// Text generation
const textProvider = getTextProvider()
const { weaponSpec, descriptionMd, model } = await textProvider.generateWeapon(
  'A sword made of frozen lightning',
  { ruleset: 'dnd5e', rarity: 'rare', style: 'fantasy_art' }
)

// Image generation
const imageProvider = getImageProvider()
const imagePrompt = buildImagePrompt(weaponSpec, 'fantasy_art')
const { imageData, mimeType, model: imageModel } = await imageProvider.generateImage(imagePrompt)
```

**Important downstream note:** `descriptionMd` is model-generated and must be sanitized before rendering as HTML. The UI component (Component 8) must use a safe markdown renderer or sanitize the output — never render with `dangerouslySetInnerHTML` without sanitization. Similarly, `mimeType` from `ImageGenerationResult` should be propagated through the storage layer (Component 4) rather than hardcoding `image/png`.

**Next:** Proceed to Component 6 - Generation Pipeline
