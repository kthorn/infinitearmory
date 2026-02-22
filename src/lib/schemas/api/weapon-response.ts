import { z } from 'zod'
import { weaponSpecSchema } from '../weapon-spec'

export const weaponResponseSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  status: z.enum(['queued', 'generating_text', 'generating_image', 'done', 'error']),
  userPrompt: z.string(),
  options: z.record(z.string(), z.unknown()),
  weaponSpec: weaponSpecSchema.nullable(),
  descriptionMd: z.string().nullable(),
  imageUrl: z.string().nullable(),
  errorMessage: z.string().nullable(),
})

export type WeaponResponse = z.infer<typeof weaponResponseSchema>

export const weaponSummarySchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  status: z.enum(['queued', 'generating_text', 'generating_image', 'done', 'error']),
  userPrompt: z.string(),
  name: z.string().nullable(), // Extracted from weaponSpec
  rarity: z.string().nullable(),
  imageUrl: z.string().nullable(),
})

export type WeaponSummary = z.infer<typeof weaponSummarySchema>
