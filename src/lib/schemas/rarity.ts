import { z } from 'zod'

export const raritySchema = z.enum([
  'common',
  'uncommon',
  'rare',
  'very_rare',
  'legendary',
  'artifact',
])

export type Rarity = z.infer<typeof raritySchema>

export const RARITY_DISPLAY: Record<Rarity, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  very_rare: 'Very Rare',
  legendary: 'Legendary',
  artifact: 'Artifact',
}

export const RARITY_COLORS: Record<Rarity, string> = {
  common: 'text-gray-400',
  uncommon: 'text-green-400',
  rare: 'text-blue-400',
  very_rare: 'text-purple-400',
  legendary: 'text-orange-400',
  artifact: 'text-red-400',
}
