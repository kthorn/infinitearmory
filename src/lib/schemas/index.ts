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
  weaponSpecSchema,
  WEAPON_SPEC_SCHEMA_DESCRIPTION,
} from './weapon-spec'
export type { WeaponProperty, WeaponSpec } from './weapon-spec'

export {
  rulesetSchema,
  styleSchema,
  generationOptionsSchema,
  RULESET_DISPLAY,
  STYLE_DISPLAY,
} from './generation-options'
export type { Ruleset, Style, GenerationOptions } from './generation-options'

export { textGenerationResultSchema, TEXT_GENERATION_SCHEMA_DESCRIPTION } from './generation-result'
export type { TextGenerationResult } from './generation-result'

// API schemas
export * from './api'
