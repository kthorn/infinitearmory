import 'server-only'
import OpenAI from 'openai'
import { env } from '@/lib/env'
import type { ImageProvider, ImageGenerationResult } from '../types'

const DEFAULT_MODEL = 'gpt-image-1'

export function createOpenAIImageProvider(model?: string): ImageProvider {
  if (!env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured')
  }

  const activeModel = model ?? DEFAULT_MODEL
  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY })

  return {
    async generateImage(prompt: string): Promise<ImageGenerationResult> {
      const response = await client.images.generate({
        model: activeModel,
        prompt,
        n: 1,
        size: '1024x1024',
      })

      const imageData = response.data?.[0]
      if (!imageData?.b64_json) {
        throw new Error('No image data in OpenAI response')
      }

      return {
        imageData: Buffer.from(imageData.b64_json, 'base64'),
        mimeType: 'image/png',
        model: activeModel,
        revisedPrompt: imageData.revised_prompt,
      }
    },
  }
}
