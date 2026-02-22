import { env } from '@/lib/env'
import { resolveImageProvider } from '@/lib/models'
import { createOpenAIImageProvider } from './openai'
import { createGeminiImageProvider } from './gemini'
import type { ImageProvider, ImageProviderType } from '../types'

export function getImageProvider(modelId?: string): ImageProvider {
  if (modelId) {
    const providerType = resolveImageProvider(modelId)
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
