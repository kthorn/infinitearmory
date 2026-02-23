# Guided Refinement Design

## Overview

Users can provide natural language guidance to refine a generated stat block, image, or both. Each refinement creates a new version of the weapon, building on the previous output rather than regenerating from scratch.

## Data Model Changes

Add two nullable fields to `WeaponVersion`:

```prisma
model WeaponVersion {
  // ... existing fields ...
  refinementPrompt String?   // User's guidance text that produced this version
  refinementType   String?   // "stats" | "image" | null (null = initial gen or blind reroll)
}
```

No changes to the `Weapon` model. The existing status state machine works as-is.

## API Changes

Extend existing endpoints with an optional `guidance` parameter:

**`POST /api/weapons/:id/reroll`**
```typescript
// Request body (updated)
{
  guidance?: string  // 1-1000 chars, optional refinement instruction
}
```

**`POST /api/weapons/:id/regenerate-image`**
```typescript
// Request body (updated)
{
  style?: string     // existing optional style override
  guidance?: string  // 1-1000 chars, optional refinement instruction
}
```

**Behavior:**
- When `guidance` is provided: use refinement prompt template (current output + guidance)
- When `guidance` is absent: existing blind reroll/regenerate behavior (unchanged)
- New `WeaponVersion` gets `refinementPrompt` and `refinementType` set when guidance is used
- Same status machine, polling, and error handling as existing rerolls

## Prompt Templates

### Stats Refinement

The AI receives:
1. Original user prompt
2. Current `weaponSpec` JSON
3. Current `descriptionMd`
4. User's refinement guidance
5. Same schema/format instructions as initial generation

Instructions: modify the existing weapon according to the guidance, preserve everything not explicitly mentioned, output in the same JSON schema.

### Image Refinement

The existing `buildImagePrompt` is augmented with user's visual guidance. The image model receives the standard weapon description + style instructions + the user's guidance for visual changes.

## UI Changes

### Weapon Card

Replace the separate "Reroll Stats" and "New Image" buttons with a unified input + button pattern:

**Stats section:**
- Always-visible text input
- Placeholder: "Describe changes (leave blank to reroll from scratch)"
- Single "Regenerate Stats" button
- Empty input → blind reroll | With text → guided refinement

**Image section:**
- Always-visible text input
- Placeholder: "Describe visual changes (leave blank for a fresh image)"
- Single "Regenerate Image" button
- Empty input → blind regenerate | With text → guided refinement

### Version Strip

- Versions created via refinement show a visual indicator (e.g., speech bubble icon)
- Hovering/clicking a refined version displays the guidance that produced it

## Error Handling

- Guidance validation: 1-1000 chars when provided, trimmed whitespace
- Generation failure: same error handling as existing rerolls (status → error, retry option)
- Concurrent refinements: reject if weapon status is not `done`
- Empty/whitespace-only guidance: treated as regular reroll/regenerate

## Scope

### In scope
- Stats refinement via guidance
- Image refinement via guidance
- Per-version refinement prompt storage
- UI text inputs for guidance
- Version strip refinement indicators

### Out of scope
- Chat-style iterative refinement threads
- Direct stat block field editing
- User-editable image prompts
- Refinement of both stats and image in a single operation (user does them independently)
