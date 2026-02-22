# Image Prompt User Visual Intent Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Pass the user's original prompt to the image generation model so visual details aren't lost.

**Architecture:** Add `userPrompt` parameter to `buildImagePrompt()`, prepend it before spec-derived details. Update all call sites in the orchestrator.

**Tech Stack:** TypeScript, Vitest

---

### Task 1: Add tests for buildImagePrompt with userPrompt

**Files:**
- Create: `src/lib/providers/prompts/__tests__/image-generation.test.ts`

**Step 1: Write the tests**

```typescript
import { describe, it, expect } from 'vitest'
import { buildImagePrompt } from '../image-generation'
import type { WeaponSpec } from '@/lib/schemas'

const mockWeaponSpec: WeaponSpec = {
  name: 'Flamebrand',
  weaponType: 'longsword',
  rarity: 'rare',
  damage: { dice: '2d6', type: 'fire', bonus: 1 },
  weight: 3,
  effects: [
    { name: 'Searing Strike', description: 'Wreathed in flames on hit', trigger: 'on_hit', duration: '1 round' },
  ],
  tags: ['glowing', 'flame'],
  requirements: {},
  value: { gp: 500 },
}

describe('buildImagePrompt', () => {
  it('includes user prompt when provided', () => {
    const result = buildImagePrompt(mockWeaponSpec, 'fantasy_art', 'a curved blade with a dragon-shaped hilt')
    expect(result).toContain("User's vision: a curved blade with a dragon-shaped hilt")
  })

  it('places user prompt before weapon description', () => {
    const result = buildImagePrompt(mockWeaponSpec, 'fantasy_art', 'blue crystal sword')
    const userVisionIndex = result.indexOf("User's vision:")
    const weaponDescIndex = result.indexOf('A detailed illustration')
    expect(userVisionIndex).toBeLessThan(weaponDescIndex)
  })

  it('omits user vision section when userPrompt is empty', () => {
    const result = buildImagePrompt(mockWeaponSpec, 'fantasy_art', '')
    expect(result).not.toContain("User's vision:")
  })

  it('omits user vision section when userPrompt is undefined', () => {
    const result = buildImagePrompt(mockWeaponSpec, 'fantasy_art')
    expect(result).not.toContain("User's vision:")
  })

  it('still includes style instructions and weapon description', () => {
    const result = buildImagePrompt(mockWeaponSpec, 'dark_fantasy', 'glowing purple dagger')
    expect(result).toContain('Dark fantasy art style')
    expect(result).toContain('Flamebrand')
    expect(result).toContain("User's vision: glowing purple dagger")
  })
})
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/providers/prompts/__tests__/image-generation.test.ts`
Expected: FAIL — `buildImagePrompt` doesn't accept 3rd argument yet

**Step 3: Commit failing test**

```bash
git add src/lib/providers/prompts/__tests__/image-generation.test.ts
git commit -m "test: add tests for buildImagePrompt with userPrompt param"
```

---

### Task 2: Update buildImagePrompt to accept userPrompt

**Files:**
- Modify: `src/lib/providers/prompts/image-generation.ts:3`

**Step 1: Update the function signature and template**

Change `buildImagePrompt` to:

```typescript
export function buildImagePrompt(weaponSpec: WeaponSpec, style: Style, userPrompt?: string): string {
  const styleInstructions = getStyleInstructions(style)
  const weaponDescription = buildWeaponDescription(weaponSpec)
  const userVisionSection = userPrompt?.trim() ? `\n\nUser's vision: ${userPrompt.trim()}` : ''

  return `${styleInstructions}${userVisionSection}

A detailed illustration of a fantasy weapon: ${weaponDescription}

The weapon should be shown on a neutral background, centered in frame, with dramatic lighting that highlights its magical properties. High detail, professional quality artwork. Do not include any text.`
}
```

**Step 2: Run tests to verify they pass**

Run: `npx vitest run src/lib/providers/prompts/__tests__/image-generation.test.ts`
Expected: All 5 tests PASS

**Step 3: Commit**

```bash
git add src/lib/providers/prompts/image-generation.ts
git commit -m "feat: add userPrompt parameter to buildImagePrompt"
```

---

### Task 3: Pass userPrompt through orchestrator call sites

**Files:**
- Modify: `src/lib/generation/orchestrator.ts:52` (generateWeapon)
- Modify: `src/lib/generation/orchestrator.ts:113` (regenerateImage)

**Step 1: Update generateWeapon call (line 52)**

Change:
```typescript
const imagePrompt = buildImagePrompt(textResult.weaponSpec, options.style)
```
To:
```typescript
const imagePrompt = buildImagePrompt(textResult.weaponSpec, options.style, userPrompt)
```

**Step 2: Update regenerateImage call (line 113)**

Change:
```typescript
const imagePrompt = buildImagePrompt(weaponSpec, imageStyle)
```
To:
```typescript
const imagePrompt = buildImagePrompt(weaponSpec, imageStyle, weapon.userPrompt)
```

**Step 3: Run full test suite**

Run: `npx vitest run`
Expected: All tests PASS (no breaking changes — parameter is optional)

**Step 4: Commit**

```bash
git add src/lib/generation/orchestrator.ts
git commit -m "feat: pass userPrompt to image generation for visual fidelity"
```

---

### Task 4: Verify build

**Step 1: Run build**

Run: `npm run build`
Expected: Build succeeds with no type errors

**Step 2: If build fails, fix type errors and re-run**
