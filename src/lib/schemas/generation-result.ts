import { z } from 'zod'
import { weaponSpecSchema } from './weapon-spec'

// Schema for what the LLM should return
export const textGenerationResultSchema = z.object({
  weaponSpec: weaponSpecSchema,
  descriptionMd: z.string().min(1).max(5000),
})

export type TextGenerationResult = z.infer<typeof textGenerationResultSchema>

// For LLM prompt - the full expected JSON structure
export const TEXT_GENERATION_SCHEMA_DESCRIPTION = `{
  "weaponSpec": <WeaponSpec object>,
  "descriptionMd": "string (1-5000 chars, markdown formatted flavor text and lore)"
}`
