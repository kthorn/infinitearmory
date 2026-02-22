import { z } from 'zod'
import { weaponSummarySchema } from './weapon-response'

export const listWeaponsQuerySchema = z.object({
  page: z.preprocess((v) => (v === null || v === '' ? undefined : v), z.coerce.number().int().min(1).default(1)),
  limit: z.preprocess((v) => (v === null || v === '' ? undefined : v), z.coerce.number().int().min(1).max(50).default(20)),
})

export type ListWeaponsQuery = z.infer<typeof listWeaponsQuerySchema>

export const listWeaponsResponseSchema = z.object({
  weapons: z.array(weaponSummarySchema),
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  hasMore: z.boolean(),
})

export type ListWeaponsResponse = z.infer<typeof listWeaponsResponseSchema>
