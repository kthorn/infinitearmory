# Design: Pass User Prompt to Image Generation

**Date:** 2026-02-22
**Status:** Approved

## Problem

User visual details (physical descriptions like "curved blade with dragon hilt", aesthetic qualities like "dark and menacing with purple energy") are lost during image generation. The `buildImagePrompt()` function only receives the structured `weaponSpec` output from the text model and the `style` option — never the user's original prompt.

## Decision

Pass the user's original prompt through to `buildImagePrompt()` and prepend it to the image prompt, giving the user's visual intent priority over spec-derived details.

## Design

### Image prompt structure

```
{style instructions}

User's vision: {userPrompt}

A detailed illustration of a fantasy weapon: {spec-derived description}

The weapon should be shown on a neutral background, centered in frame,
with dramatic lighting that highlights its magical properties.
High detail, professional quality artwork. Do not include any text.
```

User prompt is placed after style instructions but before spec details, giving it visual priority. Spec details supplement anything the user didn't specify.

### Changes

1. **`src/lib/providers/prompts/image-generation.ts`** — `buildImagePrompt()` gains a `userPrompt: string` parameter. Inserted as "User's vision: {userPrompt}" section.

2. **`src/lib/generation/orchestrator.ts`** — Pass `userPrompt` through to `buildImagePrompt()` call.

### Scope

- 2 files changed
- No schema, database, or UI changes
- Backwards compatible: if userPrompt is empty, the "User's vision" section is omitted

### Priority rule

User's visual intent wins over text model output. If the user says "blue crystal sword" but the text model generates a fire weapon, the image should show blue crystal.
