import 'server-only'
import Anthropic from '@anthropic-ai/sdk'
import { env } from '@/lib/env'
import { textGenerationResultSchema } from '@/lib/schemas'
import { buildWeaponPrompt, buildRepairPrompt, stripCodeFences } from '../prompts'
import type { TextProvider, TextGenerationResult } from '../types'
import type { GenerationOptions } from '@/lib/schemas'

const MODEL = 'claude-sonnet-4-20250514'

export function createAnthropicTextProvider(): TextProvider {
  if (!env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not configured')
  }

  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })

  return {
    async generateWeapon(prompt: string, options: GenerationOptions): Promise<TextGenerationResult> {
      const userPrompt = buildWeaponPrompt(prompt, options)

      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 2000,
        messages: [{ role: 'user', content: userPrompt }],
        system:
          'You are a fantasy RPG game designer. Always respond with valid JSON only, no other text or markdown formatting.',
      })

      const textBlock = response.content.find((block) => block.type === 'text')
      if (!textBlock || textBlock.type !== 'text') {
        throw new Error('No text content in Anthropic response')
      }

      const content = stripCodeFences(textBlock.text)

      // Parse and validate JSON
      let parsed: unknown
      try {
        parsed = JSON.parse(content)
      } catch {
        parsed = await attemptRepair(client, content, 'Invalid JSON syntax')
      }

      const validated = textGenerationResultSchema.safeParse(parsed)
      if (!validated.success) {
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

async function attemptRepair(client: Anthropic, invalidJson: string, error: string): Promise<unknown> {
  const repairPrompt = buildRepairPrompt(invalidJson, error)

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2000,
    messages: [{ role: 'user', content: repairPrompt }],
    system: 'You fix JSON errors. Return only valid JSON, no other text.',
  })

  const textBlock = response.content.find((block) => block.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text content in repair response')
  }

  return JSON.parse(stripCodeFences(textBlock.text))
}
