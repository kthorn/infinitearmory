// Enums and primitives
export { raritySchema, RARITY_DISPLAY, RARITY_COLORS } from './rarity'
export type { Rarity } from './rarity'

export { damageTypeSchema, damageSchema } from './damage'
export type { DamageType, Damage } from './damage'

export { effectTriggerSchema, effectSchema, TRIGGER_DISPLAY } from './effect'
export type { EffectTrigger, Effect } from './effect'

export { chargesSchema } from './charges'
export type { Charges } from './charges'

// Main schemas
export {
  weaponPropertySchema,
  fantasyWeaponSpecSchema,
  scifiHandheldSpecSchema,
  turretSpecSchema,
  mechSpecSchema,
  weaponSpecSchema,
  WEAPON_SPEC_SCHEMA_DESCRIPTION,
  FANTASY_WEAPON_SCHEMA_DESCRIPTION,
  SCIFI_HANDHELD_SCHEMA_DESCRIPTION,
  TURRET_SCHEMA_DESCRIPTION,
  MECH_SCHEMA_DESCRIPTION,
} from './weapon-spec'
export type {
  WeaponProperty,
  FantasyWeaponSpec,
  SciFiHandheldSpec,
  TurretSpec,
  MechSpec,
  WeaponSpec,
} from './weapon-spec'

export {
  categorySchema,
  rulesetSchema,
  styleSchema,
  generationOptionsSchema,
  CATEGORY_DISPLAY,
  RULESET_DISPLAY,
  STYLE_DISPLAY,
  CATEGORY_STYLES,
  CATEGORY_RULESET,
  CATEGORY_DEFAULT_STYLE,
} from './generation-options'
export type { Category, Ruleset, Style, GenerationOptions } from './generation-options'

export { textGenerationResultSchema, TEXT_GENERATION_SCHEMA_DESCRIPTION } from './generation-result'
export type { TextGenerationResult } from './generation-result'

// API schemas
export * from './api'
