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
