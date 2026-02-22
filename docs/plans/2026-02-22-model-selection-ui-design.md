# Model Selection UI Design

## Overview

Add UI elements to the weapon generation form allowing users to choose specific text generation and image generation models from each provider. Models are grouped by provider with per-request selection.

## Approach

**Per-Request Model Selection** — The form sends `textModel` and `imageModel` alongside existing options. Provider factories create instances for the requested model. No new API endpoints or server-side registry.

## Model List

### Text Models

| Provider | Model ID | Display Label | Default |
|----------|----------|---------------|---------|
| OpenAI | `gpt-5-mini` | GPT-5 Mini | |
| OpenAI | `gpt-5` | GPT-5 | |
| OpenAI | `gpt-5.2` | GPT-5.2 | yes |
| Anthropic | `claude-haiku-4-5` | Claude Haiku 4.5 | |
| Anthropic | `claude-sonnet-4-0` | Claude Sonnet 4 | |
| Anthropic | `claude-sonnet-4-6` | Claude Sonnet 4.6 | yes |
| Anthropic | `claude-opus-4-6` | Claude Opus 4.6 | |

### Image Models

| Provider | Model ID | Display Label | Default |
|----------|----------|---------------|---------|
| OpenAI | `gpt-image-1` | GPT Image 1 | yes |
| OpenAI | `gpt-image-1-mini` | GPT Image 1 Mini | |
| Google | `gemini-2.5-flash-image` | Gemini 2.5 Flash | yes |
| Google | `imagen-4.0-fast-generate-001` | Imagen 4 Fast | |
| Google | `imagen-4.0-generate-001` | Imagen 4 | |
| Google | `imagen-4.0-ultra-generate-001` | Imagen 4 Ultra | |

## Architecture

### New File: `src/lib/models.ts`

Static model registry shared between client and server. Exports `TEXT_MODELS` and `IMAGE_MODELS` as typed constants grouped by provider. Helper functions to resolve provider from model ID and get default model.

### Schema Changes (`src/lib/schemas/generation-options.ts`)

Add optional `textModel` and `imageModel` string fields to `generationOptionsSchema`. When omitted, server uses env-configured provider defaults.

### Provider Factory Changes

Refactor `getTextProvider()` and `getImageProvider()` to accept an optional model ID parameter:
- If model ID provided: resolve which provider it belongs to, create provider with that model
- If omitted: fall back to current `env.TEXT_PROVIDER`/`env.IMAGE_PROVIDER` behavior

Each provider constructor (`createOpenAITextProvider`, `createAnthropicTextProvider`, etc.) accepts an optional `model` parameter instead of using hardcoded `const MODEL`.

Singleton pattern removed — providers are lightweight and created per-request.

### Orchestrator Changes

Minimal: read `options.textModel` / `options.imageModel` and pass to provider factories.

### UI Changes (`src/components/weapon-form.tsx`)

Add two `<Select>` dropdowns with `<optgroup>` for provider grouping:

```
┌─────────────────────────────────────────┐
│ Weapon Concept                          │
│ [textarea]                              │
│                                         │
│ Ruleset        Art Style      Rarity    │
│ [D&D 5e ▼]    [Fantasy ▼]   [Auto ▼]  │
│                                         │
│ Text Model              Image Model     │
│ [GPT-5.2 ▼]           [GPT Image 1 ▼]  │
│                                         │
│ [        Generate Weapon              ] │
└─────────────────────────────────────────┘
```

Two columns on desktop (`md:grid-cols-2`), stacked on mobile.

### Data Flow

1. Form sends `{ prompt, options: { ruleset, style, rarity?, textModel, imageModel } }`
2. API validates via `createWeaponRequestSchema` (updated with model fields)
3. Options (including model choices) stored in DB `options` JSON column
4. Orchestrator reads model from options, passes to provider factories
5. Providers use specified model ID in API calls
6. Result model names recorded in existing `textModel`/`imageModel` DB columns

### Backward Compatibility

- Model fields are optional in schema — existing requests without models continue to work
- Environment variable defaults (`TEXT_PROVIDER`, `IMAGE_PROVIDER`) still serve as fallback
- No database migration needed (model choices stored in existing `options` JSON)

### Provider-Specific Notes

- **OpenAI Image**: New `gpt-image-*` models use a different API (`client.images.generate` still works but parameters differ from DALL-E). Need to check if `response_format: 'b64_json'` and `size: '1024x1024'` are supported.
- **Google Imagen**: Imagen models may use a different API path than Gemini native image gen. Need to verify `@google/genai` SDK support.
- **API Key Validation**: Server should only allow models whose provider has an API key configured. Return clear error if user selects an Anthropic model but `ANTHROPIC_API_KEY` is not set.
