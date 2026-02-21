import type { Weapon } from '@prisma/client'

// Re-export environment types
export type { Env } from '@/lib/env'

// Re-export Prisma types
export type { Weapon }

// Status enum as const for type safety
export const WEAPON_STATUS = {
  QUEUED: 'queued',
  GENERATING_TEXT: 'generating_text',
  GENERATING_IMAGE: 'generating_image',
  DONE: 'done',
  ERROR: 'error',
} as const

export type WeaponStatus = (typeof WEAPON_STATUS)[keyof typeof WEAPON_STATUS]

// Weapon with parsed JSON fields (for API responses)
export type WeaponWithParsedFields = Omit<Weapon, 'options' | 'weaponSpec'> & {
  options: Record<string, unknown>
  weaponSpec: Record<string, unknown> | null
}
