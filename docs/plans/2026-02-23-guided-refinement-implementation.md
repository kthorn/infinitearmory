# Guided Refinement Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow users to provide natural language guidance to refine a weapon's stat block or image, creating a new version that builds on the previous output.

**Architecture:** Extend existing reroll/regenerate endpoints and orchestrator functions with an optional `guidance` parameter. New refinement prompt templates wrap current output + guidance. DB migration adds refinement metadata to WeaponVersion. UI replaces action buttons with always-visible guidance inputs.

**Tech Stack:** Next.js 16 (App Router), Prisma/SQLite, Zod, React 19, Tailwind 4, Vitest

---

### Task 1: Database Migration — Add refinement fields to WeaponVersion

**Files:**
- Modify: `prisma/schema.prisma:43-62`
- Create: `prisma/migrations/<timestamp>_add_refinement_fields/migration.sql` (via prisma migrate)

**Step 1: Update Prisma schema**

Add two fields to the `WeaponVersion` model in `prisma/schema.prisma`:

```prisma
model WeaponVersion {
  id            String   @id @default(cuid())
  createdAt     DateTime @default(now())

  // Parent weapon
  weaponId      String
  weapon        Weapon   @relation(fields: [weaponId], references: [id], onDelete: Cascade)
  versionNumber Int

  // Generated content
  descriptionMd String?
  weaponSpec    String?  // JSON string
  imageUrl      String?
  imagePrompt   String?
  textModel     String?
  imageModel    String?

  // Refinement metadata
  refinementPrompt String?  // User's guidance text that produced this version
  refinementType   String?  // "stats" | "image" | null (null = initial gen or blind reroll)

  @@unique([weaponId, versionNumber])
  @@index([weaponId])
}
```

**Step 2: Run migration**

Run: `npx prisma migrate dev --name add_refinement_fields`
Expected: Migration succeeds, adds two nullable columns to WeaponVersion table.

**Step 3: Update WeaponVersion response schema**

In `src/lib/schemas/api/weapon-response.ts`, add refinement fields to `weaponVersionSchema`:

```typescript
export const weaponVersionSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  versionNumber: z.number(),
  weaponSpec: z.nullable(weaponSpecSchema),
  descriptionMd: z.nullable(z.string()),
  imageUrl: z.nullable(z.string()),
  textModel: z.nullable(z.string()),
  imageModel: z.nullable(z.string()),
  refinementPrompt: z.nullable(z.string()),
  refinementType: z.nullable(z.string()),
})
```

**Step 4: Update toWeaponVersionResponse helper**

Find `toWeaponVersionResponse` in `src/lib/api` and add the new fields to its output mapping:

```typescript
refinementPrompt: version.refinementPrompt ?? null,
refinementType: version.refinementType ?? null,
```

**Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/ src/lib/schemas/api/weapon-response.ts src/lib/api/
git commit -m "feat: add refinement fields to WeaponVersion schema"
```

---

### Task 2: Refinement Prompt Template for Stats

**Files:**
- Modify: `src/lib/providers/prompts/weapon-generation.ts`
- Create: `src/lib/providers/prompts/__tests__/weapon-refinement.test.ts`

**Step 1: Write the failing test**

Create `src/lib/providers/prompts/__tests__/weapon-refinement.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { buildWeaponRefinementPrompt } from '../weapon-generation'

describe('buildWeaponRefinementPrompt', () => {
  const baseArgs = {
    userPrompt: 'A flaming sword',
    currentSpec: JSON.stringify({
      category: 'fantasy_weapon',
      name: 'Blazebrand',
      rarity: 'rare',
      weaponType: 'longsword',
      damage: { dice: '2d6', type: 'fire' },
      effects: [],
      rulesText: 'Deals fire damage',
      tags: ['fire'],
      properties: ['versatile'],
    }),
    currentDescription: '## Blazebrand\nA legendary sword wreathed in flame.',
    guidance: 'Make it deal more damage and add a frost effect',
    category: 'fantasy_weapon' as const,
  }

  it('includes the current weapon spec', () => {
    const prompt = buildWeaponRefinementPrompt(baseArgs)
    expect(prompt).toContain('Blazebrand')
    expect(prompt).toContain('2d6')
  })

  it('includes the user guidance', () => {
    const prompt = buildWeaponRefinementPrompt(baseArgs)
    expect(prompt).toContain('Make it deal more damage and add a frost effect')
  })

  it('includes the original user prompt', () => {
    const prompt = buildWeaponRefinementPrompt(baseArgs)
    expect(prompt).toContain('A flaming sword')
  })

  it('includes instructions to preserve unchanged fields', () => {
    const prompt = buildWeaponRefinementPrompt(baseArgs)
    expect(prompt).toMatch(/preserve|unchanged|not mentioned/i)
  })

  it('includes the current description', () => {
    const prompt = buildWeaponRefinementPrompt(baseArgs)
    expect(prompt).toContain('A legendary sword wreathed in flame')
  })

  it('includes correct schema description for the category', () => {
    const prompt = buildWeaponRefinementPrompt(baseArgs)
    // Fantasy weapon prompts should reference the fantasy weapon schema
    expect(prompt).toContain('weaponSpec')
    expect(prompt).toContain('descriptionMd')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/providers/prompts/__tests__/weapon-refinement.test.ts`
Expected: FAIL — `buildWeaponRefinementPrompt` does not exist yet.

**Step 3: Implement buildWeaponRefinementPrompt**

Add to `src/lib/providers/prompts/weapon-generation.ts`:

```typescript
export interface RefinementPromptArgs {
  userPrompt: string
  currentSpec: string       // JSON string of current weaponSpec
  currentDescription: string
  guidance: string
  category: 'fantasy_weapon' | 'scifi_handheld' | 'scifi_turret' | 'mech'
}

export function buildWeaponRefinementPrompt(args: RefinementPromptArgs): string {
  const { userPrompt, currentSpec, currentDescription, guidance, category } = args
  const schemaDescription = getSchemaDescriptionForCategory(category)

  return `You are refining an existing weapon based on user feedback. Modify the weapon according to the guidance below. Preserve all fields and values that are not explicitly mentioned in the guidance.

ORIGINAL USER CONCEPT:
${userPrompt}

CURRENT WEAPON SPEC (JSON):
${currentSpec}

CURRENT DESCRIPTION:
${currentDescription}

USER'S REFINEMENT GUIDANCE:
${guidance}

INSTRUCTIONS:
- Apply the requested changes to the weapon
- Preserve everything not mentioned in the guidance — do not change fields the user did not ask about
- Keep the same category and general identity of the weapon
- Update the description to reflect any changes, but preserve the tone and style
- The output must conform exactly to the schema below

OUTPUT FORMAT:
Return a JSON object with exactly this structure:
{
  "weaponSpec": ${schemaDescription},
  "descriptionMd": "Updated markdown flavor text reflecting the changes."
}

IMPORTANT:
- Return ONLY valid JSON, no other text
- All string values must be properly escaped
- Keep the ENTIRE response under 4000 characters to ensure valid JSON output`
}

function getSchemaDescriptionForCategory(category: string): string {
  switch (category) {
    case 'fantasy_weapon':
      return FANTASY_WEAPON_SCHEMA_DESCRIPTION
    case 'scifi_handheld':
      return SCIFI_HANDHELD_SCHEMA_DESCRIPTION
    case 'scifi_turret':
      return TURRET_SCHEMA_DESCRIPTION
    case 'mech':
      return MECH_SCHEMA_DESCRIPTION
    default:
      return FANTASY_WEAPON_SCHEMA_DESCRIPTION
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/providers/prompts/__tests__/weapon-refinement.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/providers/prompts/weapon-generation.ts src/lib/providers/prompts/__tests__/weapon-refinement.test.ts
git commit -m "feat: add stats refinement prompt template"
```

---

### Task 3: Image Refinement Prompt Support

**Files:**
- Modify: `src/lib/providers/prompts/image-generation.ts`
- Create: `src/lib/providers/prompts/__tests__/image-refinement.test.ts`

**Step 1: Write the failing test**

Create `src/lib/providers/prompts/__tests__/image-refinement.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { buildImagePrompt } from '../image-generation'
import type { WeaponSpec } from '@/lib/schemas'

const mockSpec: WeaponSpec = {
  category: 'fantasy_weapon',
  name: 'Blazebrand',
  rarity: 'rare',
  weaponType: 'longsword',
  damage: { dice: '2d6', type: 'fire' },
  effects: [],
  rulesText: 'Deals fire damage',
  tags: ['fire', 'glowing'],
  properties: ['versatile'],
}

describe('buildImagePrompt with guidance', () => {
  it('includes guidance when provided', () => {
    const result = buildImagePrompt(mockSpec, 'fantasy_art', 'A fire sword', 'Make the flames blue and more intense')
    expect(result).toContain('Make the flames blue and more intense')
  })

  it('works without guidance (existing behavior)', () => {
    const result = buildImagePrompt(mockSpec, 'fantasy_art', 'A fire sword')
    expect(result).toContain('Blazebrand')
    expect(result).not.toContain('Refinement')
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/providers/prompts/__tests__/image-refinement.test.ts`
Expected: FAIL — the guidance parameter test fails (buildImagePrompt doesn't accept 4th arg yet, or doesn't include it).

**Step 3: Update buildImagePrompt to accept guidance**

Modify `src/lib/providers/prompts/image-generation.ts`. Change the function signature and add guidance to the output:

```typescript
export function buildImagePrompt(weaponSpec: WeaponSpec, style: Style, userPrompt?: string, guidance?: string): string {
  const styleInstructions = getStyleInstructions(style)
  const weaponDescription = buildWeaponDescription(weaponSpec)
  const trimmedPrompt = userPrompt?.trim()
  const userVisionSection = trimmedPrompt ? `\n\nUser's vision: ${trimmedPrompt}` : ''
  const framing = getFramingInstructions(weaponSpec.category)
  const trimmedGuidance = guidance?.trim()
  const guidanceSection = trimmedGuidance ? `\n\nRefinement guidance: ${trimmedGuidance}` : ''

  return `${styleInstructions}${userVisionSection}${guidanceSection}

A detailed illustration of ${weaponDescription}

${framing} High detail, professional quality artwork. Do not include any text.`
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/providers/prompts/__tests__/image-refinement.test.ts`
Expected: PASS

**Step 5: Run all existing tests to verify no regressions**

Run: `npx vitest run`
Expected: All tests PASS (the new optional param doesn't break existing callers).

**Step 6: Commit**

```bash
git add src/lib/providers/prompts/image-generation.ts src/lib/providers/prompts/__tests__/image-refinement.test.ts
git commit -m "feat: add guidance parameter to buildImagePrompt"
```

---

### Task 4: Orchestrator — Thread guidance through reroll and regenerate

**Files:**
- Modify: `src/lib/generation/orchestrator.ts`

**Step 1: Update regenerateImage to accept guidance**

In `src/lib/generation/orchestrator.ts`, change the `regenerateImage` signature and thread guidance through:

```typescript
export async function regenerateImage(weaponId: string, style?: string, guidance?: string): Promise<void> {
```

In the image generation section (around line 123), pass guidance to `buildImagePrompt`:

```typescript
const imagePrompt = buildImagePrompt(weaponSpec, imageStyle, weapon.userPrompt, guidance)
```

After `createVersionAndActivate(weaponId)` (line 151), update the new version with refinement metadata if guidance was provided:

```typescript
// Create version snapshot
const version = await createVersionAndActivate(weaponId)
if (guidance?.trim() && version) {
  await db.weaponVersion.update({
    where: { id: version.id },
    data: {
      refinementPrompt: guidance.trim(),
      refinementType: 'image',
    },
  })
}
```

**Step 2: Update createVersionAndActivate to return the version**

Change `createVersionAndActivate` to return the created version:

```typescript
async function createVersionAndActivate(weaponId: string): Promise<{ id: string } | null> {
```

And change `return` to return the version at the end:

```typescript
  await db.weapon.update({
    where: { id: weaponId },
    data: { activeVersionId: version.id },
  })

  return version
}
```

Update all existing callers of `createVersionAndActivate` — they can ignore the return value (already do via `await`).

**Step 3: Update rerollWeapon to accept and thread guidance**

Change `rerollWeapon` signature:

```typescript
export async function rerollWeapon(weaponId: string, guidance?: string): Promise<void> {
```

When guidance is provided, use a **refinement** flow instead of the full pipeline. Add this logic after the options parsing, before `generateWeapon`:

```typescript
if (guidance?.trim()) {
  // Refinement flow: use current spec + guidance to generate modified stats
  await refineWeaponStats(weaponId, weapon, options, guidance.trim())
  return
}

// Clear existing results and run full pipeline (existing blind reroll behavior)
await db.weapon.update({ ... })
await generateWeapon({ ... })
```

**Step 4: Implement refineWeaponStats**

Add a new function in `orchestrator.ts`:

```typescript
import { buildWeaponRefinementPrompt } from '@/lib/providers'

async function refineWeaponStats(
  weaponId: string,
  weapon: { userPrompt: string; weaponSpec: string | null; descriptionMd: string | null; imageUrl: string | null; imagePrompt: string | null; imageModel: string | null },
  options: GenerationOptions,
  guidance: string
): Promise<void> {
  if (!weapon.weaponSpec) {
    throw new Error(`Weapon has no spec to refine: ${weaponId}`)
  }

  await updateStatus(weaponId, WEAPON_STATUS.GENERATING_TEXT)

  const rawSpec = JSON.parse(weapon.weaponSpec)
  if (rawSpec && !rawSpec.category) rawSpec.category = 'fantasy_weapon'
  const category = rawSpec.category ?? 'fantasy_weapon'

  const textProvider = getTextProvider(options.textModel)
  const refinementPrompt = buildWeaponRefinementPrompt({
    userPrompt: weapon.userPrompt,
    currentSpec: weapon.weaponSpec,
    currentDescription: weapon.descriptionMd ?? '',
    guidance,
    category,
  })

  // Use the text provider with the refinement prompt as the "user prompt"
  // and pass the same options for schema validation
  const textResult = await withRetry(
    () => textProvider.generateWeapon(refinementPrompt, options),
    {
      maxAttempts: 2,
      delayMs: 2000,
      shouldRetry: isTransientError,
    }
  )

  // Save refined text results, preserve existing image
  await db.weapon.update({
    where: { id: weaponId },
    data: {
      weaponSpec: JSON.stringify(textResult.weaponSpec),
      descriptionMd: textResult.descriptionMd,
      textModel: textResult.model,
      promptVersion: PROMPT_VERSION,
      status: WEAPON_STATUS.DONE,
    },
  })

  // Create version snapshot with refinement metadata
  const version = await createVersionAndActivate(weaponId)
  if (version) {
    await db.weaponVersion.update({
      where: { id: version.id },
      data: {
        refinementPrompt: guidance,
        refinementType: 'stats',
      },
    })
  }
}
```

**Step 5: Export buildWeaponRefinementPrompt from providers index**

In `src/lib/providers/prompts/index.ts` (or wherever prompts are re-exported), add:

```typescript
export { buildWeaponRefinementPrompt } from './weapon-generation'
```

And in `src/lib/providers/index.ts`:

```typescript
export { buildWeaponPrompt, buildRepairPrompt, buildImagePrompt, buildWeaponRefinementPrompt } from './prompts'
```

**Step 6: Run all tests**

Run: `npx vitest run`
Expected: All tests PASS.

**Step 7: Commit**

```bash
git add src/lib/generation/orchestrator.ts src/lib/providers/
git commit -m "feat: thread guidance through orchestrator for stats and image refinement"
```

---

### Task 5: API Routes — Accept guidance parameter

**Files:**
- Modify: `src/app/api/weapons/[id]/reroll-stats/route.ts`
- Modify: `src/app/api/weapons/[id]/regenerate-image/route.ts`

**Step 1: Write failing tests for guidance acceptance**

Add to `src/app/api/weapons/__tests__/reroll-stats.test.ts`:

```typescript
it('accepts optional guidance in request body', async () => {
  const { rerollWeapon } = await import('@/lib/generation')
  vi.mocked(db.weapon.findUnique)
    .mockResolvedValueOnce(baseMockWeapon)
    .mockResolvedValueOnce({ ...baseMockWeapon, _count: { versions: 2 } })

  const req = makeRequest('http://localhost/api/weapons/test-id/reroll-stats', {
    method: 'POST',
    body: JSON.stringify({ guidance: 'Make it stronger' }),
    headers: { 'Content-Type': 'application/json', 'Content-Length': '30' },
  })
  const res = await POST(req, { params: Promise.resolve({ id: 'test-id' }) })

  expect(res.status).toBe(200)
  expect(vi.mocked(rerollWeapon)).toHaveBeenCalledWith('test-id', 'Make it stronger')
})
```

Add to `src/app/api/weapons/__tests__/regenerate-image.test.ts`:

```typescript
it('accepts optional guidance in request body', async () => {
  const { regenerateImage } = await import('@/lib/generation')
  vi.mocked(db.weapon.findUnique)
    .mockResolvedValueOnce(baseMockWeapon)
    .mockResolvedValueOnce({ ...baseMockWeapon, _count: { versions: 2 } })

  const req = makeRequest('http://localhost/api/weapons/test-id/regenerate-image', {
    method: 'POST',
    body: JSON.stringify({ guidance: 'Make it darker' }),
    headers: { 'Content-Type': 'application/json', 'Content-Length': '28' },
  })
  const res = await POST(req, { params: Promise.resolve({ id: 'test-id' }) })

  expect(res.status).toBe(200)
  expect(vi.mocked(regenerateImage)).toHaveBeenCalledWith('test-id', undefined, 'Make it darker')
})
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/app/api/weapons/__tests__/reroll-stats.test.ts src/app/api/weapons/__tests__/regenerate-image.test.ts`
Expected: FAIL

**Step 3: Update reroll-stats route**

In `src/app/api/weapons/[id]/reroll-stats/route.ts`, add body parsing with optional guidance:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { rerollWeapon } from '@/lib/generation'
import { badRequest, errorResponse, notFound, serverError, handleZodError, toWeaponResponse } from '@/lib/api'

interface RouteParams {
  params: Promise<{ id: string }>
}

const requestSchema = z.object({
  guidance: z.optional(z.string().min(1).max(1000)),
})

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    // Parse optional body
    let guidance: string | undefined
    const contentLength = request.headers.get('content-length')
    const hasBody = contentLength !== null && contentLength !== '0'
    if (hasBody) {
      let body: unknown
      try {
        body = await request.json()
      } catch {
        return badRequest('Invalid JSON body')
      }
      const parsed = requestSchema.safeParse(body)
      if (!parsed.success) {
        return handleZodError(parsed.error)
      }
      guidance = parsed.data.guidance
    }

    const weapon = await db.weapon.findUnique({ where: { id } })
    if (!weapon) {
      return notFound('Weapon not found')
    }
    if (weapon.status === 'generating_text' || weapon.status === 'generating_image') {
      return errorResponse('Weapon is currently being generated', 409)
    }

    await rerollWeapon(id, guidance)

    const updated = await db.weapon.findUnique({
      where: { id },
      include: { _count: { select: { versions: true } } },
    })
    if (!updated) {
      return notFound('Weapon was deleted during reroll')
    }
    return NextResponse.json(toWeaponResponse(updated))
  } catch (error) {
    console.error('POST /api/weapons/:id/reroll-stats error:', error)
    return serverError('Failed to reroll weapon')
  }
}
```

**Step 4: Update regenerate-image route**

In `src/app/api/weapons/[id]/regenerate-image/route.ts`, add `guidance` to the request schema:

```typescript
const requestSchema = z.object({
  style: z.optional(styleSchema),
  guidance: z.optional(z.string().min(1).max(1000)),
})
```

Update the call to `regenerateImage` to pass guidance:

```typescript
await regenerateImage(id, style, parsed.data.guidance)
```

Handle the case where only guidance is provided (no style) — the existing body parsing logic already handles this since both fields are optional.

**Step 5: Run tests to verify they pass**

Run: `npx vitest run src/app/api/weapons/__tests__/reroll-stats.test.ts src/app/api/weapons/__tests__/regenerate-image.test.ts`
Expected: PASS

**Step 6: Run all tests**

Run: `npx vitest run`
Expected: All tests PASS.

**Step 7: Commit**

```bash
git add src/app/api/weapons/[id]/reroll-stats/route.ts src/app/api/weapons/[id]/regenerate-image/route.ts src/app/api/weapons/__tests__/
git commit -m "feat: accept guidance parameter in reroll and regenerate-image API routes"
```

---

### Task 6: UI — Guidance inputs in WeaponCard

**Files:**
- Modify: `src/components/weapon-card.tsx`
- Modify: `src/app/weapons/[id]/weapon-detail-client.tsx`

**Step 1: Update callback signatures**

In `src/components/weapon-card.tsx`, update the prop types to accept guidance:

```typescript
interface WeaponCardProps {
  weapon: WeaponResponse
  versions?: WeaponVersion[]
  onRegenerateImage?: (guidance?: string) => Promise<void>
  onRerollStats?: (guidance?: string) => Promise<void>
  onDelete?: () => Promise<void>
  onPromoteVersion?: (versionId: string) => Promise<void>
  onDeleteVersion?: (versionId: string) => Promise<void>
}
```

**Step 2: Add guidance state and inputs**

Add state for the guidance inputs:

```typescript
const [imageGuidance, setImageGuidance] = useState('')
const [statsGuidance, setStatsGuidance] = useState('')
```

Update `handleRegenerateImage` to pass guidance:

```typescript
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
```

Update `handleRerollStats` similarly:

```typescript
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
```

**Step 3: Replace action buttons with input + button groups**

Replace the `CardFooter` actions section. Instead of separate buttons, show guidance inputs with action buttons:

```tsx
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
```

**Step 4: Update WeaponDetailClient to pass guidance through API calls**

In `src/app/weapons/[id]/weapon-detail-client.tsx`, update the handler functions:

```typescript
async function handleRegenerateImage(guidance?: string) {
  const body = guidance ? JSON.stringify({ guidance }) : undefined
  const response = await fetch(`/api/weapons/${weapon.id}/regenerate-image`, {
    method: 'POST',
    ...(body ? { body, headers: { 'Content-Type': 'application/json' } } : {}),
  })
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.error || 'Failed to regenerate image')
  }
  await refetch()
  await fetchVersions()
}

async function handleRerollStats(guidance?: string) {
  const body = guidance ? JSON.stringify({ guidance }) : undefined
  const response = await fetch(`/api/weapons/${weapon.id}/reroll-stats`, {
    method: 'POST',
    ...(body ? { body, headers: { 'Content-Type': 'application/json' } } : {}),
  })
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.error || 'Failed to reroll stats')
  }
  await refetch()
  await fetchVersions()
}
```

**Step 5: Run all tests**

Run: `npx vitest run`
Expected: All tests PASS.

**Step 6: Commit**

```bash
git add src/components/weapon-card.tsx src/app/weapons/[id]/weapon-detail-client.tsx
git commit -m "feat: add guidance text inputs for image and stats refinement in weapon card"
```

---

### Task 7: Version Strip — Show refinement indicators

**Files:**
- Modify: `src/components/version-strip.tsx`

**Step 1: Update VersionStrip to receive full version data**

The `WeaponVersion` type already includes `refinementPrompt` and `refinementType` from Task 1. The VersionStrip component already receives `versions: WeaponVersion[]`, so no prop changes needed.

**Step 2: Add refinement indicator to version thumbnails**

In the version info section of `version-strip.tsx`, add a visual indicator for refined versions:

```tsx
{/* Version info */}
<div className="px-1 py-0.5 text-center">
  <span className="text-xs text-slate-400">v{version.versionNumber}</span>
  {isActive && (
    <span className="ml-1 text-xs text-indigo-400">✓</span>
  )}
  {version.refinementType && (
    <span className="ml-1 text-xs text-amber-400" title={version.refinementPrompt ?? 'Refined'}>
      ✎
    </span>
  )}
</div>
```

**Step 3: Add tooltip/hover showing refinement prompt**

For refined versions, show the guidance text on hover. The `title` attribute on the edit icon above provides a basic tooltip. For a richer display, add to the hover overlay for non-active refined versions:

```tsx
{/* Hover actions (non-active versions only) */}
{!isActive && (
  <div className="absolute inset-0 bg-slate-900/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
    {version.refinementPrompt && (
      <p className="text-[10px] text-amber-300 px-1 text-center line-clamp-2 mb-0.5">
        &ldquo;{version.refinementPrompt}&rdquo;
      </p>
    )}
    <button
      type="button"
      onClick={() => handlePromote(version.id)}
      disabled={loadingAction !== null}
      className="text-xs text-indigo-400 hover:text-indigo-300 px-2 py-0.5 rounded bg-slate-800"
    >
      Use
    </button>
    <button
      type="button"
      onClick={() => handleDelete(version.id)}
      disabled={loadingAction !== null}
      className="text-xs text-red-400 hover:text-red-300 px-2 py-0.5 rounded bg-slate-800"
    >
      Delete
    </button>
  </div>
)}
```

**Step 4: Run all tests**

Run: `npx vitest run`
Expected: All tests PASS.

**Step 5: Commit**

```bash
git add src/components/version-strip.tsx
git commit -m "feat: show refinement indicator and guidance in version strip"
```

---

### Task 8: Manual Testing & Polish

**Step 1: Start the dev server**

Run: `npm run dev`

**Step 2: Test the full refinement flow**

1. Create a new weapon from the home page
2. Wait for generation to complete
3. In the stats guidance input, type "Make it legendary rarity with more damage" and click "Refine Stats"
4. Verify: a new version is created, stats are updated, image is preserved
5. In the image guidance input, type "Make the colors darker and add lightning effects" and click "Refine Image"
6. Verify: a new version is created, image is regenerated, stats are preserved
7. Check the version strip: refined versions should show the ✎ indicator
8. Hover over a refined version: the guidance text should appear

**Step 3: Test blind reroll still works**

1. Leave the stats guidance input empty, click "Reroll Stats"
2. Verify: full reroll behavior (stats + image regenerated from scratch)
3. Leave the image guidance input empty, click "New Image"
4. Verify: fresh image generated without guidance

**Step 4: Test edge cases**

1. Try submitting whitespace-only guidance — should behave as blind reroll
2. Try submitting very long guidance (near 1000 chars) — should work
3. Try submitting guidance while generation is in progress — should be blocked (buttons disabled)

**Step 5: Final commit if any polish needed**

```bash
git add -A
git commit -m "fix: polish guided refinement UI and edge cases"
```
