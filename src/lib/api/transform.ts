import type { Weapon } from '@prisma/client'
import type { WeaponResponse, WeaponSummary } from '@/lib/schemas'

function safeJsonParse(value: string | null, fallback: unknown = null): unknown {
  if (!value) return fallback
  try {
    return JSON.parse(value)
  } catch {
    console.error('Failed to parse JSON from DB column')
    return fallback
  }
}

export function toWeaponResponse(weapon: Weapon): WeaponResponse {
  return {
    id: weapon.id,
    createdAt: weapon.createdAt.toISOString(),
    updatedAt: weapon.updatedAt.toISOString(),
    status: weapon.status as WeaponResponse['status'],
    userPrompt: weapon.userPrompt,
    options: (safeJsonParse(weapon.options, {}) as Record<string, unknown>),
    weaponSpec: safeJsonParse(weapon.weaponSpec) as WeaponResponse['weaponSpec'],
    descriptionMd: weapon.descriptionMd,
    imageUrl: weapon.imageUrl,
    errorMessage: weapon.errorMessage,
    textModel: weapon.textModel ?? null,
    imageModel: weapon.imageModel ?? null,
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
