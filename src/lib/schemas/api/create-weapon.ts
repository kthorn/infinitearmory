import { z } from 'zod'
import { generationOptionsSchema } from '../generation-options'

export const createWeaponRequestSchema = z.object({
  prompt: z.string().trim().min(3).max(2000),
  options: z.optional(generationOptionsSchema),
}).transform((data) => ({
  ...data,
  options: generationOptionsSchema.parse(data.options ?? {}),
}))

export type CreateWeaponRequest = z.infer<typeof createWeaponRequestSchema>
