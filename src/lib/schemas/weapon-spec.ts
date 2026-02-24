import { z } from 'zod'
import { raritySchema } from './rarity'
import { damageSchema } from './damage'
import { effectSchema } from './effect'
import { chargesSchema } from './charges'

// ── Fantasy weapon properties ──
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

// ── Shared base fields ──
const baseFields = {
  name: z.string().min(1).max(100),
  rarity: raritySchema,
  damage: damageSchema,
  effects: z.array(effectSchema).max(10).default([]),
  rulesText: z.string().min(1).max(2000),
  tags: z.array(z.string().min(1).max(30)).max(20).default([]),
}

// ── Fantasy Weapon ──
export const fantasyWeaponSpecSchema = z.object({
  category: z.literal('fantasy_weapon'),
  ...baseFields,
  weaponType: z.string().min(1).max(50),
  properties: z.array(weaponPropertySchema).default([]),
  toHitBonus: z.number().int().min(-5).max(10).optional(),
  damageBonus: z.number().int().min(-5).max(10).optional(),
  charges: chargesSchema.optional(),
})

export type FantasyWeaponSpec = z.infer<typeof fantasyWeaponSpecSchema>

// ── Sci-Fi Handheld ──
export const scifiHandheldSpecSchema = z.object({
  category: z.literal('scifi_handheld'),
  ...baseFields,
  weaponClass: z.string().min(1).max(50),
  firingMode: z.enum(['single', 'burst', 'auto', 'charge']),
  ammoCapacity: z.number().int().min(1).max(999).optional(),
  energyCost: z.number().int().min(1).max(100).optional(),
  range: z.enum(['short', 'medium', 'long', 'extreme']),
})

export type SciFiHandheldSpec = z.infer<typeof scifiHandheldSpecSchema>

// ── Sci-Fi Turret ──
export const turretSpecSchema = z.object({
  category: z.literal('scifi_turret'),
  ...baseFields,
  mountType: z.enum(['fixed', 'swivel', 'tracking', 'orbital']),
  firingMode: z.enum(['single', 'burst', 'auto', 'charge']),
  ammoCapacity: z.number().int().min(1).max(9999).optional(),
  energyCost: z.number().int().min(1).max(100).optional(),
  range: z.enum(['medium', 'long', 'extreme']),
  rateOfFire: z.string().min(1).max(100),
  deploymentRequirements: z.string().max(500).optional(),
})

export type TurretSpec = z.infer<typeof turretSpecSchema>

// ── Mech ──
const mechWeaponSystemSchema = z.object({
  name: z.string().min(1).max(100),
  damage: damageSchema,
  location: z.string().min(1).max(50),
  heatGenerated: z.number().min(0).max(20),
})

export const mechSpecSchema = z.object({
  category: z.literal('mech'),
  ...baseFields,
  mechClass: z.enum(['light', 'medium', 'heavy', 'assault']),
  tonnage: z.number().int().min(20).max(100),
  armorRating: z.number().int().min(1).max(500),
  heatCapacity: z.number().int().min(1).max(50),
  mobility: z.object({
    speed: z.number().int().min(1).max(20),
    jumpJets: z.boolean(),
  }),
  weaponSystems: z.array(mechWeaponSystemSchema).min(1).max(10),
  specialSystems: z.array(z.string().min(1).max(100)).default([]),
})

export type MechSpec = z.infer<typeof mechSpecSchema>

// ── Discriminated Union ──
export const weaponSpecSchema = z.discriminatedUnion('category', [
  fantasyWeaponSpecSchema,
  scifiHandheldSpecSchema,
  turretSpecSchema,
  mechSpecSchema,
])

export type WeaponSpec = z.infer<typeof weaponSpecSchema>

// ── Schema descriptions for LLM prompts ──

export const FANTASY_WEAPON_SCHEMA_DESCRIPTION = `{
  "category": "fantasy_weapon",
  "name": "string (1-100 chars, the weapon's name)",
  "rarity": "common" | "uncommon" | "rare" | "very_rare" | "legendary" | "artifact",
  "weaponType": "string (e.g., 'longsword', 'shortbow', 'dagger')",
  "properties": ["finesse", "thrown", "versatile", etc.] (optional array),
  "damage": { "dice": "XdY format (e.g., '1d8')", "type": "slashing" | "piercing" | "bludgeoning" | "fire" | "cold" | "lightning" | "thunder" | "acid" | "poison" | "necrotic" | "radiant" | "force" | "psychic" },
  "toHitBonus": number (optional, -5 to +10),
  "damageBonus": number (optional, -5 to +10),
  "charges": { "current": number, "max": number, "recharge": "string" } (optional),
  "effects": [{ "trigger": "on_hit" | "on_crit" | "activated" | "passive" | "on_attune" | "on_roll_1" | "on_roll_20", "description": "string" }] (max 10),
  "rulesText": "string (complete rules text for the item)",
  "tags": ["string"] (max 20, keywords for searching)
}`

export const SCIFI_HANDHELD_SCHEMA_DESCRIPTION = `{
  "category": "scifi_handheld",
  "name": "string (1-100 chars, the weapon's name)",
  "rarity": "common" | "uncommon" | "rare" | "very_rare" | "legendary" | "artifact",
  "weaponClass": "string (e.g., 'pistol', 'rifle', 'shotgun', 'SMG', 'sniper', 'launcher', 'blade')",
  "firingMode": "single" | "burst" | "auto" | "charge",
  "ammoCapacity": number (optional, 1-999),
  "energyCost": number (optional, 1-100),
  "range": "short" | "medium" | "long" | "extreme",
  "damage": { "dice": "XdY format (e.g., '2d8')", "type": "plasma" | "laser" | "kinetic" | "explosive" | "emp" | "ion" | "fire" | etc. },
  "effects": [{ "trigger": "on_hit" | "on_crit" | "activated" | "passive" | "on_reload", "description": "string" }] (max 10),
  "rulesText": "string (complete rules text for the weapon)",
  "tags": ["string"] (max 20, keywords for searching)
}`

export const TURRET_SCHEMA_DESCRIPTION = `{
  "category": "scifi_turret",
  "name": "string (1-100 chars, the turret's name)",
  "rarity": "common" | "uncommon" | "rare" | "very_rare" | "legendary" | "artifact",
  "mountType": "fixed" | "swivel" | "tracking" | "orbital",
  "firingMode": "single" | "burst" | "auto" | "charge",
  "ammoCapacity": number (optional, 1-9999),
  "energyCost": number (optional, 1-100),
  "range": "medium" | "long" | "extreme",
  "rateOfFire": "string (e.g., '3 rounds/turn', 'sustained beam')",
  "deploymentRequirements": "string (optional, e.g., power source, crew, setup time)",
  "damage": { "dice": "XdY format (e.g., '3d10')", "type": "plasma" | "laser" | "kinetic" | "explosive" | etc. },
  "effects": [{ "trigger": "on_hit" | "on_crit" | "activated" | "passive" | "on_deploy" | "on_reload", "description": "string" }] (max 10),
  "rulesText": "string (complete rules text for the turret)",
  "tags": ["string"] (max 20, keywords for searching)
}`

export const MECH_SCHEMA_DESCRIPTION = `{
  "category": "mech",
  "name": "string (1-100 chars, the mech's designation/name)",
  "rarity": "common" | "uncommon" | "rare" | "very_rare" | "legendary" | "artifact",
  "mechClass": "light" | "medium" | "heavy" | "assault",
  "tonnage": number (20-100, light: 20-35, medium: 40-55, heavy: 60-75, assault: 80-100),
  "armorRating": number (1-500),
  "heatCapacity": number (1-50),
  "mobility": { "speed": number (1-20), "jumpJets": boolean },
  "weaponSystems": [{ "name": "string", "damage": { "dice": "XdY", "type": "damage type" }, "location": "string (e.g., 'left arm', 'right torso')", "heatGenerated": number (0-20) }] (1-10 weapon systems, min 1 required),
  "specialSystems": ["string"] (e.g., "ECM Suite", "Targeting Computer"),
  "damage": { "dice": "XdY", "type": "damage type" } (primary damage, should match first weaponSystems entry),
  "effects": [{ "trigger": "on_hit" | "on_crit" | "activated" | "passive" | "on_overheat", "description": "string" }] (max 10),
  "rulesText": "string (complete rules text for the mech)",
  "tags": ["string"] (max 20, keywords for searching)
}`

// Legacy alias - kept for backward compatibility with existing prompt code
export const WEAPON_SPEC_SCHEMA_DESCRIPTION = FANTASY_WEAPON_SCHEMA_DESCRIPTION
