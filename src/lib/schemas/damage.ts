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

export const damageSchema = z.object({
  dice: z.string().regex(/^[1-9]\d*d[1-9]\d*$/, 'Must be in format "XdY" where X,Y >= 1 (e.g., "2d6")'),
  type: damageTypeSchema,
})

export type Damage = z.infer<typeof damageSchema>
