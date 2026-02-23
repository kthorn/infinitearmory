import 'server-only'
import { GoogleGenAI } from '@google/genai'
import { env } from '@/lib/env'
import type { ImageProvider, ImageGenerationResult } from '../types'

const DEFAULT_MODEL = 'gemini-2.5-flash-image'

export function createGeminiImageProvider(model?: string): ImageProvider {
  if (!env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured')
  }

  const activeModel = model ?? DEFAULT_MODEL
  const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY })

  return {
    async generateImage(prompt: string): Promise<ImageGenerationResult> {
      const response = await ai.models.generateContent({
        model: activeModel,
        contents: prompt,
        config: {
          responseModalities: ['Text', 'Image'],
          aspectRatio: '1:1',
        },
      })

      const imagePart = response.candidates?.[0]?.content?.parts?.find(
        (part) => part.inlineData?.mimeType?.startsWith('image/')
      )

      if (!imagePart?.inlineData?.data) {
        throw new Error('No image data in Gemini response')
      }

      return {
        imageData: Buffer.from(imagePart.inlineData.data, 'base64'),
        mimeType: imagePart.inlineData.mimeType ?? 'image/png',
        model: activeModel,
      }
    },
  }
}
