export interface ModelOption {
  id: string
  label: string
  default?: boolean
}

export const TEXT_MODELS: Record<string, ModelOption[]> = {
  anthropic: [
    { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6', default: true },
    { id: 'claude-opus-4-6', label: 'Claude Opus 4.6' },
    { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5' },
    { id: 'claude-sonnet-4-0', label: 'Claude Sonnet 4' },
  ],
  openai: [
    { id: 'gpt-5.2', label: 'GPT-5.2' },
    { id: 'gpt-5', label: 'GPT-5' },
    { id: 'gpt-5-mini', label: 'GPT-5 Mini' },
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
    { id: 'gemini-2.5-flash-image', label: 'Nano Banana', default: true },
    { id: 'gemini-3-pro-image-preview', label: 'Nano Banana Pro' },
  ],
}

export const PROVIDER_DISPLAY: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  gemini: 'Google',
}

export function resolveTextProvider(modelId: string): keyof typeof TEXT_MODELS {
  for (const [provider, models] of Object.entries(TEXT_MODELS)) {
    if (models.some((m) => m.id === modelId)) return provider as keyof typeof TEXT_MODELS
  }
  throw new Error(`Unknown text model: ${modelId}`)
}

export function resolveImageProvider(modelId: string): keyof typeof IMAGE_MODELS {
  for (const [provider, models] of Object.entries(IMAGE_MODELS)) {
    if (models.some((m) => m.id === modelId)) return provider as keyof typeof IMAGE_MODELS
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

export function getModelLabel(modelId: string): string {
  for (const models of Object.values(TEXT_MODELS)) {
    const found = models.find((m) => m.id === modelId)
    if (found) return found.label
  }
  for (const models of Object.values(IMAGE_MODELS)) {
    const found = models.find((m) => m.id === modelId)
    if (found) return found.label
  }
  return modelId
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

export function safeResolveTextProvider(modelId: string | undefined): { provider: keyof typeof TEXT_MODELS; model: string } {
  if (!modelId) return { provider: resolveTextProvider(getDefaultTextModel()), model: getDefaultTextModel() }
  try {
    return { provider: resolveTextProvider(modelId), model: modelId }
  } catch {
    console.warn(`Unknown stored text model "${modelId}", falling back to default`)
    const fallback = getDefaultTextModel()
    return { provider: resolveTextProvider(fallback), model: fallback }
  }
}

export function safeResolveImageProvider(modelId: string | undefined): { provider: keyof typeof IMAGE_MODELS; model: string } {
  if (!modelId) return { provider: resolveImageProvider(getDefaultImageModel()), model: getDefaultImageModel() }
  try {
    return { provider: resolveImageProvider(modelId), model: modelId }
  } catch {
    console.warn(`Unknown stored image model "${modelId}", falling back to default`)
    const fallback = getDefaultImageModel()
    return { provider: resolveImageProvider(fallback), model: fallback }
  }
}
