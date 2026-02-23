import { z } from 'zod'
import { weaponSpecSchema } from '../weapon-spec'

export const weaponResponseSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  status: z.enum(['queued', 'generating_text', 'generating_image', 'done', 'error']),
  userPrompt: z.string(),
  options: z.record(z.string(), z.unknown()),
  weaponSpec: z.nullable(weaponSpecSchema),
  descriptionMd: z.nullable(z.string()),
  imageUrl: z.nullable(z.string()),
  errorMessage: z.nullable(z.string()),
  textModel: z.nullable(z.string()),
  imageModel: z.nullable(z.string()),
  activeVersionId: z.nullable(z.string()),
  versionCount: z.number(),
})

export type WeaponResponse = z.infer<typeof weaponResponseSchema>

export const weaponVersionSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  versionNumber: z.number(),
  weaponSpec: z.nullable(weaponSpecSchema),
  descriptionMd: z.nullable(z.string()),
  imageUrl: z.nullable(z.string()),
  textModel: z.nullable(z.string()),
  imageModel: z.nullable(z.string()),
})

export type WeaponVersion = z.infer<typeof weaponVersionSchema>

export const weaponSummarySchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  status: z.enum(['queued', 'generating_text', 'generating_image', 'done', 'error']),
  userPrompt: z.string(),
  name: z.nullable(z.string()), // Extracted from weaponSpec
  rarity: z.nullable(z.string()),
  imageUrl: z.nullable(z.string()),
})

export type WeaponSummary = z.infer<typeof weaponSummarySchema>
