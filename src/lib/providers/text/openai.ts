import 'server-only'
import OpenAI from 'openai'
import { env } from '@/lib/env'
import { textGenerationResultSchema } from '@/lib/schemas'
import { buildWeaponPrompt, buildRepairPrompt } from '../prompts'
import type { TextProvider, TextGenerationResult } from '../types'
import type { GenerationOptions } from '@/lib/schemas'

const DEFAULT_MODEL = 'gpt-5.2'

export function createOpenAITextProvider(model?: string): TextProvider {
  if (!env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not configured')
  }

  const activeModel = model ?? DEFAULT_MODEL
  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY })

  return {
    async generateWeapon(prompt: string, options: GenerationOptions): Promise<TextGenerationResult> {
      const weaponPrompt = buildWeaponPrompt(prompt, options)

      const response = await client.chat.completions.create({
        model: activeModel,
        messages: [
          { role: 'system', content: 'You are a tabletop RPG game designer specializing in weapons, turrets, and mechs for both fantasy and sci-fi settings. Always respond with valid JSON only.' },
          { role: 'user', content: weaponPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.8,
        max_completion_tokens: 10000,
      })

      const content = response.choices[0]?.message?.content
      if (!content) {
        throw new Error('No content in OpenAI response')
      }

      let parsed: unknown
      try {
        parsed = JSON.parse(content)
      } catch (e) {
        console.error(`[openai] JSON parse failed (model=${activeModel}):`, e instanceof Error ? e.message : e)
        console.error(`[openai] Raw LLM response (${content.length} chars):\n${content}`)
        parsed = await attemptRepair(client, activeModel, content, 'Invalid JSON syntax')
      }

      const validated = textGenerationResultSchema.safeParse(parsed)
      if (!validated.success) {
        const errorMsg = validated.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')
        parsed = await attemptRepair(client, activeModel, content, errorMsg)

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

async function attemptRepair(client: OpenAI, model: string, invalidJson: string, error: string): Promise<unknown> {
  const repairPrompt = buildRepairPrompt(invalidJson, error)

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: 'You fix JSON errors. Return only valid JSON.' },
      { role: 'user', content: repairPrompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0,
    max_completion_tokens: 10000,
  })

  const content = response.choices[0]?.message?.content
  if (!content) {
    throw new Error('No content in repair response')
  }

  try {
    return JSON.parse(content)
  } catch (e) {
    console.error(`[openai] Repair also failed (model=${model}):`, e instanceof Error ? e.message : e)
    console.error(`[openai] Repair response (${content.length} chars):\n${content}`)
    throw e
  }
}
