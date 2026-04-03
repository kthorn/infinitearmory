import { z } from 'zod'

export const damageTypeSchema = z.enum([
  // Fantasy
  'slashing',
  'piercing',
  'bludgeoning',
  'fire',
  'cold',
  'lightning',
  'thunder',
  'acid',
  'poison',
  'necrotic',
  'radiant',
  'force',
  'psychic',
  // Sci-fi
  'plasma',
  'laser',
  'kinetic',
  'explosive',
  'emp',
  'ion',
])

export type DamageType = z.infer<typeof damageTypeSchema>

const VALID_DIE_SIZES = [4, 6, 8, 10, 12] as const
const MAX_DICE_COUNT = 12
const MAX_DIE_SIZE = 12

export const damageSchema = z.object({
  dice: z.string()
    .regex(/^[1-9]\d*d[1-9]\d*$/, 'Must be in format "XdY" (e.g., "2d6")')
    .refine((val) => {
      const parts = val.split('d')
      const count = parseInt(parts[0]!, 10)
      const size = parseInt(parts[1]!, 10)
      return (
        (VALID_DIE_SIZES as readonly number[]).includes(size) &&
        count >= 1 &&
        count <= MAX_DICE_COUNT &&
        size <= MAX_DIE_SIZE
      )
    }, `Dice must use d4/d6/d8/d10/d12, max ${MAX_DICE_COUNT}d${MAX_DIE_SIZE}`),
  type: damageTypeSchema,
})

export type Damage = z.infer<typeof damageSchema>
