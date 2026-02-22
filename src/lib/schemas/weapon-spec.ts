import { z } from 'zod'
import { raritySchema } from './rarity'
import { damageSchema } from './damage'
import { effectSchema } from './effect'
import { chargesSchema } from './charges'

export const weaponPropertySchema = z.enum([
  'ammunition',
  'finesse',
  'heavy',
  'light',
  'loading',
  'range',
  'reach',
  'special',
  'thrown',
  'two_handed',
  'versatile',
])

export type WeaponProperty = z.infer<typeof weaponPropertySchema>

export const weaponSpecSchema = z.object({
  name: z.string().min(1).max(100),
  rarity: raritySchema,
  weaponType: z.string().min(1).max(50), // e.g., "longsword", "shortbow", "warhammer"
  properties: z.array(weaponPropertySchema).default([]),
  damage: damageSchema,
  toHitBonus: z.number().int().min(-5).max(10).optional(),
  damageBonus: z.number().int().min(-5).max(10).optional(),
  charges: chargesSchema.optional(),
  effects: z.array(effectSchema).max(10).default([]),
  rulesText: z.string().min(1).max(2000),
  tags: z.array(z.string().min(1).max(30)).max(20).default([]),
})

export type WeaponSpec = z.infer<typeof weaponSpecSchema>

// For LLM prompt generation - describes the expected schema
export const WEAPON_SPEC_SCHEMA_DESCRIPTION = `{
  "name": "string (1-100 chars, the weapon's name)",
  "rarity": "common" | "uncommon" | "rare" | "very_rare" | "legendary" | "artifact",
  "weaponType": "string (e.g., 'longsword', 'shortbow', 'dagger')",
  "properties": ["finesse", "thrown", "versatile", etc.] (optional array),
  "damage": { "dice": "XdY format (e.g., '1d8')", "type": "slashing" | "piercing" | "bludgeoning" | etc. },
  "toHitBonus": number (optional, -5 to +10),
  "damageBonus": number (optional, -5 to +10),
  "charges": { "current": number, "max": number, "recharge": "string" } (optional),
  "effects": [{ "trigger": "on_hit" | "on_crit" | "activated" | "passive" | "on_attune" | "on_roll_1" | "on_roll_20", "description": "string" }] (max 10),
  "rulesText": "string (complete rules text for the item)",
  "tags": ["string"] (max 20, keywords for searching)
}`
