import { env } from '@/lib/env'
import { resolveTextProvider } from '@/lib/models'
import { createOpenAITextProvider } from './openai'
import { createAnthropicTextProvider } from './anthropic'
import { createGeminiTextProvider } from './gemini'
import type { TextProvider, TextProviderType } from '../types'

export function getTextProvider(modelId?: string): TextProvider {
  if (modelId) {
    const providerType = resolveTextProvider(modelId)
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
