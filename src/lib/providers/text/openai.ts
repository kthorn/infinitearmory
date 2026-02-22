import 'server-only'
import OpenAI from 'openai'
import { env } from '@/lib/env'
import { textGenerationResultSchema } from '@/lib/schemas'
import { buildWeaponPrompt, buildRepairPrompt } from '../prompts'
import type { TextProvider, TextGenerationResult } from '../types'
import type { GenerationOptions } from '@/lib/schemas'

const MODEL = 'gpt-4o'

export function createOpenAITextProvider(): TextProvider {
  if (!env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured')
  }

  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY })

  return {
    async generateWeapon(prompt: string, options: GenerationOptions): Promise<TextGenerationResult> {
      const weaponPrompt = buildWeaponPrompt(prompt, options)

      const response = await client.chat.completions.create({
        model: MODEL,
        messages: [
          { role: 'system', content: 'You are a fantasy RPG game designer. Always respond with valid JSON only.' },
          { role: 'user', content: weaponPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.8,
        max_tokens: 2000,
      })

      const content = response.choices[0]?.message?.content
      if (!content) {
        throw new Error('No content in OpenAI response')
      }

      // Parse and validate JSON
      let parsed: unknown
      try {
        parsed = JSON.parse(content)
      } catch {
        // Try to repair with a follow-up call
        parsed = await attemptRepair(client, content, 'Invalid JSON syntax')
      }

      const validated = textGenerationResultSchema.safeParse(parsed)
      if (!validated.success) {
        // Try to repair with schema errors
        const errorMsg = validated.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')
        parsed = await attemptRepair(client, content, errorMsg)

        const revalidated = textGenerationResultSchema.safeParse(parsed)
        if (!revalidated.success) {
          throw new Error(`Schema validation failed after repair: ${revalidated.error.message}`)
        }

        return {
          weaponSpec: revalidated.data.weaponSpec,
          descriptionMd: revalidated.data.descriptionMd,
          model: MODEL,
        }
      }

      return {
        weaponSpec: validated.data.weaponSpec,
        descriptionMd: validated.data.descriptionMd,
        model: MODEL,
      }
    },
  }
}

async function attemptRepair(client: OpenAI, invalidJson: string, error: string): Promise<unknown> {
  const repairPrompt = buildRepairPrompt(invalidJson, error)

  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [
      { role: 'system', content: 'You fix JSON errors. Return only valid JSON.' },
      { role: 'user', content: repairPrompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0,
    max_tokens: 2000,
  })

  const content = response.choices[0]?.message?.content
  if (!content) {
    throw new Error('No content in repair response')
  }

  return JSON.parse(content)
}
