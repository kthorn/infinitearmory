import 'server-only'
import OpenAI from 'openai'
import { env } from '@/lib/env'
import type { ImageProvider, ImageGenerationResult } from '../types'

const MODEL = 'dall-e-3'

export function createOpenAIImageProvider(): ImageProvider {
  if (!env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured')
  }

  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY })

  return {
    async generateImage(prompt: string): Promise<ImageGenerationResult> {
      const response = await client.images.generate({
        model: MODEL,
        prompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard',
        response_format: 'b64_json',
      })

      const imageData = response.data?.[0]
      if (!imageData?.b64_json) {
        throw new Error('No image data in OpenAI response')
      }

      return {
        imageData: Buffer.from(imageData.b64_json, 'base64'),
        mimeType: 'image/png',
        model: MODEL,
        revisedPrompt: imageData.revised_prompt,
      }
    },
  }
}
