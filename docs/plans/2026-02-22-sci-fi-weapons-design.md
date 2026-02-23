# Sci-Fi Weapon Extension Design

**Date:** 2026-02-22
**Status:** Draft

## Overview

Extend the Fantasy Weapon Generator to support sci-fi weapon categories: handheld weapons, turrets, and mechs. The app will support both fantasy and sci-fi simultaneously via a single category dropdown.

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Schema approach | Separate schemas per category with shared base | Clean type safety, no unused optional fields per category |
| Genre selection | Single flat dropdown (Fantasy Weapon / Sci-Fi Handheld / Sci-Fi Turret / Mech) | Simple, no nested UI needed |
| Mech detail level | Single card, integrated weapon systems listed in effects/rules | Consistent with existing card UX |
| Fantasy rulesets | D&D 5e only (remove Pathfinder 2e, Generic) | Simplify |
| Sci-fi rulesets | Generic Sci-Fi for handheld/turrets, BattleTech-inspired for mechs | Prompt changes per ruleset |
| Art styles | Keep existing 6 + add sci-fi styles | Genre filters which styles are shown |
| Stat system | Hybrid — shared core fields, category-specific extras | Authentic sci-fi feel without losing consistency |

## Schema Design

### Shared Base Fields

All categories share:
- `name: string` (1-100 chars)
- `rarity: Rarity` (common through artifact)
- `damage: { dice: "XdY", type: DamageType }` — primary damage
- `effects: Effect[]` (max 10)
- `rulesText: string` (1-2000 chars)
- `tags: string[]` (max 20)

### Category: `fantasy_weapon` (existing, mostly unchanged)

```typescript
FantasyWeaponSpec {
  category: "fantasy_weapon"
  // shared base fields
  weaponType: string          // "longsword", "shortbow", etc.
  properties: WeaponProperty[] // finesse, heavy, etc.
  toHitBonus?: number         // -5 to +10
  damageBonus?: number        // -5 to +10
  charges?: Charges
}
```

No changes to existing fantasy weapon behavior except adding the `category` discriminator field.

### Category: `scifi_handheld`

```typescript
SciFiHandheldSpec {
  category: "scifi_handheld"
  // shared base fields
  weaponClass: string          // "pistol", "rifle", "shotgun", "SMG", "sniper", "launcher", "blade"
  firingMode: "single" | "burst" | "auto" | "charge"
  ammoCapacity?: number
  energyCost?: number
  range: "short" | "medium" | "long" | "extreme"
}
```

### Category: `scifi_turret`

```typescript
TurretSpec {
  category: "scifi_turret"
  // shared base fields
  mountType: "fixed" | "swivel" | "tracking" | "orbital"
  firingMode: "single" | "burst" | "auto" | "charge"
  ammoCapacity?: number
  energyCost?: number
  range: "medium" | "long" | "extreme"
  rateOfFire: string          // e.g., "3 rounds/turn", "sustained beam"
  deploymentRequirements?: string // power source, crew, setup time
}
```

### Category: `mech`

BattleTech-inspired stat block:

```typescript
MechSpec {
  category: "mech"
  // shared base fields (damage = primary weapon damage)
  mechClass: "light" | "medium" | "heavy" | "assault"
  tonnage: number
  armorRating: number
  heatCapacity: number
  mobility: {
    speed: number             // movement units per turn
    jumpJets: boolean
  }
  weaponSystems: Array<{
    name: string
    damage: { dice: string, type: DamageType }
    location: string          // "left arm", "right torso", "center torso", etc.
    heatGenerated: number
  }>                          // max 6
  specialSystems: string[]    // "ECM Suite", "Targeting Computer", etc.
}
```

### Union Type

```typescript
type WeaponSpec = FantasyWeaponSpec | SciFiHandheldSpec | TurretSpec | MechSpec
```

Discriminated on `category` field. Zod `z.discriminatedUnion("category", [...])` handles validation.

### New Damage Types

Add sci-fi damage types to the existing `DamageType` enum:

- `plasma`
- `laser`
- `kinetic`
- `explosive`
- `emp`
- `ion`

Existing types (`fire`, `cold`, `lightning`, etc.) remain available for all categories.

### New Effect Triggers

Add sci-fi triggers to existing set:

- `on_overheat` — mech/turret heat threshold
- `on_deploy` — turret placement
- `on_reload` — ammo-based weapons

### Rulesets

Replace current 3-option enum with:

```typescript
type Ruleset = "dnd5e" | "generic_scifi" | "battletech"
```

Category determines valid rulesets:
- `fantasy_weapon` → `dnd5e`
- `scifi_handheld` → `generic_scifi`
- `scifi_turret` → `generic_scifi`
- `mech` → `battletech`

Ruleset is auto-selected based on category (no separate dropdown needed).

### Art Styles

Add sci-fi styles:

- `technical_blueprint` — schematic/blueprint style with labels and measurements
- `cyberpunk` — neon-lit, gritty, high-tech-low-life aesthetic
- `hard_scifi` — clean, utilitarian, NASA/SpaceX industrial design feel

Genre determines which styles are available:
- Fantasy: `realistic`, `fantasy_art`, `dark_fantasy`, `anime`, `pixel_art`, `watercolor`
- Sci-Fi/Mech: `realistic`, `cyberpunk`, `hard_scifi`, `technical_blueprint`, `anime`, `pixel_art`

## Prompt Templates

### Text Generation

Each category gets its own prompt builder function:

- `buildFantasyWeaponPrompt()` — existing `buildWeaponPrompt()`, renamed
- `buildSciFiHandheldPrompt()` — sci-fi weapon designer persona, generic sci-fi rules
- `buildTurretPrompt()` — defensive emplacement focus, deployment context
- `buildMechPrompt()` — BattleTech-inspired mech designer persona, heat management, weapon loadout balance

Each prompt includes:
- Category-specific schema description (like existing `WEAPON_SPEC_SCHEMA_DESCRIPTION`)
- Ruleset instructions appropriate to the category
- Same output format: `{ weaponSpec, descriptionMd }`

### Image Generation

Extend `buildImagePrompt()` to handle all categories:

- Fantasy weapons: existing behavior (weapon on neutral background)
- Sci-fi handheld: weapon shown at angle, sci-fi context (holographic display, armory rack)
- Turret: mounted/deployed view, environment context
- Mech: full mech illustration, scale reference, dynamic pose

`buildWeaponDescription()` branches on category to construct appropriate image descriptions.

## UI Changes

### WeaponForm

- Replace ruleset dropdown with category dropdown: `Fantasy Weapon | Sci-Fi Handheld | Sci-Fi Turret | Mech`
- Style dropdown filters options based on selected category
- Rarity dropdown stays (applies to all categories)
- Ruleset auto-set from category (hidden)
- Text/image model dropdowns unchanged

### StatBlock Component

Branch rendering on `category`:
- `fantasy_weapon`: existing stat block (unchanged)
- `scifi_handheld`: weapon class, firing mode, ammo, range, damage
- `scifi_turret`: mount type, rate of fire, deployment requirements, damage
- `mech`: mech class, tonnage, armor, heat capacity, mobility, weapon systems table, special systems

### WeaponCard

Minimal changes — the image + tabs (stats/lore) structure works for all categories. Category badge/icon in the card header.

## Database

No schema migration needed. The `weaponSpec` column stores JSON, and the `options` column stores generation options as JSON. Both accommodate the new shapes without DB changes.

## Generation Pipeline

The existing 3-step pipeline (text → image → storage) stays the same. Changes:

1. **Text generation**: dispatch to category-specific prompt builder based on `options.category`
2. **Validation**: use `z.discriminatedUnion` to validate the correct schema based on `category`
3. **Image generation**: pass category to `buildImagePrompt()` for appropriate framing
4. **Storage**: no changes — same S3 + SQLite flow

## Migration

Existing weapons have no `category` field. Handle with:
- Default to `"fantasy_weapon"` when `category` is absent in stored `weaponSpec` JSON
- No backfill migration needed — just handle missing field at read time
