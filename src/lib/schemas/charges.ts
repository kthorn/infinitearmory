import { z } from 'zod'

export const chargesSchema = z.object({
  current: z.number().int().min(0),
  max: z.number().int().min(1),
  recharge: z.string().min(1), // e.g., "dawn", "long rest", "1d4 at dawn"
}).refine(({ current, max }) => current <= max, {
  message: 'current charges cannot exceed max charges',
  path: ['current'],
})

export type Charges = z.infer<typeof chargesSchema>
