import type { Weapon, WeaponVersion as WeaponVersionRow } from '@prisma/client'
import type { WeaponResponse, WeaponSummary, WeaponVersion } from '@/lib/schemas'

function safeJsonParse(value: string | null, fallback: unknown = null): unknown {
  if (!value) return fallback
  try {
    return JSON.parse(value)
  } catch {
    console.error('Failed to parse JSON from DB column')
    return fallback
  }
}

/**
 * Normalize legacy weapon specs that don't have a `category` field.
 * Injects `category: "fantasy_weapon"` for pre-sci-fi records.
 */
function normalizeWeaponSpec(raw: unknown): unknown {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const spec = raw as Record<string, unknown>
    if (!spec.category) {
      return { category: 'fantasy_weapon', ...spec }
    }
  }
  return raw
}

/**
 * Normalize legacy generation options.
 * - Injects `category: "fantasy_weapon"` if missing
 * - Maps old rulesets (pathfinder2e, generic) to dnd5e
 */
function normalizeOptions(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const opts = { ...(raw as Record<string, unknown>) }

  if (!opts.category) {
    opts.category = 'fantasy_weapon'
  }

  // Map legacy rulesets
  if (opts.ruleset === 'pathfinder2e' || opts.ruleset === 'generic') {
    opts.ruleset = 'dnd5e'
  }

  return opts
}

interface WeaponWithVersionCount {
  _count?: { versions: number }
}

export function toWeaponResponse(weapon: Weapon & WeaponWithVersionCount): WeaponResponse {
  return {
    id: weapon.id,
    createdAt: weapon.createdAt.toISOString(),
    updatedAt: weapon.updatedAt.toISOString(),
    status: weapon.status as WeaponResponse['status'],
    userPrompt: weapon.userPrompt,
    options: normalizeOptions(safeJsonParse(weapon.options, {})),
    weaponSpec: normalizeWeaponSpec(safeJsonParse(weapon.weaponSpec)) as WeaponResponse['weaponSpec'],
    descriptionMd: weapon.descriptionMd,
    imageUrl: weapon.imageUrl,
    errorMessage: weapon.errorMessage,
    textModel: weapon.textModel ?? null,
    imageModel: weapon.imageModel ?? null,
    activeVersionId: weapon.activeVersionId ?? null,
    versionCount: weapon._count?.versions ?? 0,
  }
}

export function toWeaponVersionResponse(version: WeaponVersionRow): WeaponVersion {
  return {
    id: version.id,
    createdAt: version.createdAt.toISOString(),
    versionNumber: version.versionNumber,
    weaponSpec: normalizeWeaponSpec(safeJsonParse(version.weaponSpec)) as WeaponVersion['weaponSpec'],
    descriptionMd: version.descriptionMd,
    imageUrl: version.imageUrl,
    textModel: version.textModel ?? null,
    imageModel: version.imageModel ?? null,
  }
}

export function toWeaponSummary(weapon: Weapon): WeaponSummary {
  const weaponSpec = safeJsonParse(weapon.weaponSpec) as Record<string, unknown> | null

  return {
    id: weapon.id,
    createdAt: weapon.createdAt.toISOString(),
    status: weapon.status as WeaponSummary['status'],
    userPrompt: weapon.userPrompt,
    name: (weaponSpec?.name as string) ?? null,
    rarity: (weaponSpec?.rarity as string) ?? null,
    imageUrl: weapon.imageUrl,
  }
}
