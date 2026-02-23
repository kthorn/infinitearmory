import { z } from 'zod'
import { raritySchema } from './rarity'
import { getAllTextModels, getAllImageModels } from '../models'

const validTextModelIds = getAllTextModels().map((m) => m.id)
const validImageModelIds = getAllImageModels().map((m) => m.id)

export const categorySchema = z.enum([
  'fantasy_weapon',
  'scifi_handheld',
  'scifi_turret',
  'mech',
])

export type Category = z.infer<typeof categorySchema>

export const CATEGORY_DISPLAY: Record<Category, string> = {
  fantasy_weapon: 'Fantasy Weapon',
  scifi_handheld: 'Sci-Fi Handheld',
  scifi_turret: 'Sci-Fi Turret',
  mech: 'Mech',
}

export const rulesetSchema = z.enum(['dnd5e', 'generic_scifi', 'battletech'])

export type Ruleset = z.infer<typeof rulesetSchema>

export const styleSchema = z.enum([
  'realistic',
  'fantasy_art',
  'dark_fantasy',
  'anime',
  'pixel_art',
  'watercolor',
  // Sci-fi
  'technical_blueprint',
  'cyberpunk',
  'hard_scifi',
])

export type Style = z.infer<typeof styleSchema>

export const generationOptionsSchema = z.object({
  category: categorySchema.default('fantasy_weapon'),
  ruleset: rulesetSchema.default('dnd5e'),
  rarity: raritySchema.optional(),
  style: styleSchema.default('fantasy_art'),
  seed: z.number().int().optional(),
  textModel: z.string().refine((id) => validTextModelIds.includes(id), { message: 'Invalid text model ID' }).optional(),
  imageModel: z.string().refine((id) => validImageModelIds.includes(id), { message: 'Invalid image model ID' }).optional(),
})

export type GenerationOptions = z.infer<typeof generationOptionsSchema>

export const RULESET_DISPLAY: Record<Ruleset, string> = {
  dnd5e: 'D&D 5th Edition',
  generic_scifi: 'Generic Sci-Fi',
  battletech: 'BattleTech',
}

export const STYLE_DISPLAY: Record<Style, string> = {
  realistic: 'Realistic',
  fantasy_art: 'Fantasy Art',
  dark_fantasy: 'Dark Fantasy',
  anime: 'Anime',
  pixel_art: 'Pixel Art',
  watercolor: 'Watercolor',
  technical_blueprint: 'Technical Blueprint',
  cyberpunk: 'Cyberpunk',
  hard_scifi: 'Hard Sci-Fi',
}

// Category determines which styles are available
export const CATEGORY_STYLES: Record<Category, Style[]> = {
  fantasy_weapon: ['realistic', 'fantasy_art', 'dark_fantasy', 'anime', 'pixel_art', 'watercolor'],
  scifi_handheld: ['realistic', 'cyberpunk', 'hard_scifi', 'technical_blueprint', 'anime', 'pixel_art'],
  scifi_turret: ['realistic', 'cyberpunk', 'hard_scifi', 'technical_blueprint', 'anime', 'pixel_art'],
  mech: ['realistic', 'cyberpunk', 'hard_scifi', 'technical_blueprint', 'anime', 'pixel_art'],
}

// Category determines ruleset (auto-selected)
export const CATEGORY_RULESET: Record<Category, Ruleset> = {
  fantasy_weapon: 'dnd5e',
  scifi_handheld: 'generic_scifi',
  scifi_turret: 'generic_scifi',
  mech: 'battletech',
}

// Default style per category
export const CATEGORY_DEFAULT_STYLE: Record<Category, Style> = {
  fantasy_weapon: 'fantasy_art',
  scifi_handheld: 'cyberpunk',
  scifi_turret: 'hard_scifi',
  mech: 'hard_scifi',
}
