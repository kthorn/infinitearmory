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
