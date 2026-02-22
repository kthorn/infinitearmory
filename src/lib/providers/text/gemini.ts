import 'server-only'
import { GoogleGenAI } from '@google/genai'
import { env } from '@/lib/env'
import { textGenerationResultSchema } from '@/lib/schemas'
import { buildWeaponPrompt, buildRepairPrompt, stripCodeFences } from '../prompts'
import type { TextProvider, TextGenerationResult } from '../types'
import type { GenerationOptions } from '@/lib/schemas'

const DEFAULT_MODEL = 'gemini-2.5-flash'

export function createGeminiTextProvider(model?: string): TextProvider {
  if (!env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured')
  }

  const activeModel = model ?? DEFAULT_MODEL
  const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY })

  return {
    async generateWeapon(prompt: string, options: GenerationOptions): Promise<TextGenerationResult> {
      const weaponPrompt = buildWeaponPrompt(prompt, options)

      const response = await ai.models.generateContent({
        model: activeModel,
        contents: weaponPrompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.8,
          maxOutputTokens: 2000,
          systemInstruction: 'You are a fantasy RPG game designer. Always respond with valid JSON only.',
        },
      })

      const content = response.text
      if (!content) {
        throw new Error('No content in Gemini response')
      }

      let parsed: unknown
      try {
        parsed = JSON.parse(stripCodeFences(content))
      } catch {
        parsed = await attemptRepair(ai, activeModel, content, 'Invalid JSON syntax')
      }

      const validated = textGenerationResultSchema.safeParse(parsed)
      if (!validated.success) {
        const errorMsg = validated.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')
        parsed = await attemptRepair(ai, activeModel, content, errorMsg)

        const revalidated = textGenerationResultSchema.safeParse(parsed)
        if (!revalidated.success) {
          throw new Error(`Schema validation failed after repair: ${revalidated.error.message}`)
        }

        return {
          weaponSpec: revalidated.data.weaponSpec,
          descriptionMd: revalidated.data.descriptionMd,
          model: activeModel,
        }
      }

      return {
        weaponSpec: validated.data.weaponSpec,
        descriptionMd: validated.data.descriptionMd,
        model: activeModel,
      }
    },
  }
}

async function attemptRepair(ai: GoogleGenAI, model: string, invalidJson: string, error: string): Promise<unknown> {
  const repairPrompt = buildRepairPrompt(invalidJson, error)

  const response = await ai.models.generateContent({
    model,
    contents: repairPrompt,
    config: {
      responseMimeType: 'application/json',
      temperature: 0,
      maxOutputTokens: 2000,
      systemInstruction: 'You fix JSON errors. Return only valid JSON.',
    },
  })

  const content = response.text
  if (!content) {
    throw new Error('No content in Gemini repair response')
  }

  return JSON.parse(stripCodeFences(content))
}
