import { z } from 'zod'
import { raritySchema } from './rarity'

export const rulesetSchema = z.enum(['dnd5e', 'pathfinder2e', 'generic'])

export type Ruleset = z.infer<typeof rulesetSchema>

export const styleSchema = z.enum([
  'realistic',
  'fantasy_art',
  'dark_fantasy',
  'anime',
  'pixel_art',
  'watercolor',
])

export type Style = z.infer<typeof styleSchema>

export const generationOptionsSchema = z.object({
  ruleset: rulesetSchema.default('dnd5e'),
  rarity: raritySchema.optional(), // If not specified, LLM chooses appropriate rarity
  style: styleSchema.default('fantasy_art'),
  seed: z.number().int().optional(), // For reproducibility
})

export type GenerationOptions = z.infer<typeof generationOptionsSchema>

export const RULESET_DISPLAY: Record<Ruleset, string> = {
  dnd5e: 'D&D 5th Edition',
  pathfinder2e: 'Pathfinder 2e',
  generic: 'Generic Fantasy',
}

export const STYLE_DISPLAY: Record<Style, string> = {
  realistic: 'Realistic',
  fantasy_art: 'Fantasy Art',
  dark_fantasy: 'Dark Fantasy',
  anime: 'Anime',
  pixel_art: 'Pixel Art',
  watercolor: 'Watercolor',
}
