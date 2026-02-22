import type { WeaponSpec, Style } from '@/lib/schemas'

export function buildImagePrompt(weaponSpec: WeaponSpec, style: Style): string {
  const styleInstructions = getStyleInstructions(style)
  const weaponDescription = buildWeaponDescription(weaponSpec)

  return `${styleInstructions}

A detailed illustration of a fantasy weapon: ${weaponDescription}

The weapon should be shown on a neutral background, centered in frame, with dramatic lighting that highlights its magical properties. High detail, professional quality artwork. Do not include any text.`
}

function getStyleInstructions(style: Style): string {
  switch (style) {
    case 'realistic':
      return 'Photorealistic digital art style, detailed textures, dramatic studio lighting.'
    case 'fantasy_art':
      return 'Classic fantasy art style, rich colors, painterly quality, reminiscent of MTG or D&D artwork.'
    case 'dark_fantasy':
      return 'Dark fantasy art style, moody atmosphere, deep shadows, ominous lighting, gothic influences.'
    case 'anime':
      return 'Anime/manga art style, clean lines, vibrant colors, cel-shaded appearance.'
    case 'pixel_art':
      return '16-bit pixel art style, retro game aesthetic, limited color palette, clear silhouette.'
    case 'watercolor':
      return 'Watercolor painting style, soft edges, flowing colors, artistic and ethereal.'
    default:
      return 'High quality fantasy illustration.'
  }
}

function buildWeaponDescription(spec: WeaponSpec): string {
  const parts: string[] = []

  // Basic type and rarity
  parts.push(`a ${spec.rarity.replace('_', ' ')} ${spec.weaponType} called "${spec.name}"`)

  // Damage type hints at appearance
  if (spec.damage.type !== 'slashing' && spec.damage.type !== 'piercing' && spec.damage.type !== 'bludgeoning') {
    parts.push(`with ${spec.damage.type} magical energy`)
  }

  // Effects suggest visual elements
  const visualEffects = spec.effects
    .filter((e) => e.trigger === 'passive' || e.trigger === 'on_hit')
    .map((e) => e.description)
    .slice(0, 2)

  if (visualEffects.length > 0) {
    parts.push(`featuring ${visualEffects.join(' and ')}`)
  }

  // Tags can add flavor
  const visualTags = spec.tags.filter((t) =>
    ['glowing', 'ancient', 'crystalline', 'ornate', 'runic', 'ethereal', 'flame', 'frost', 'shadow', 'light'].some(
      (v) => t.includes(v)
    )
  )
  if (visualTags.length > 0) {
    parts.push(`(${visualTags.join(', ')})`)
  }

  return parts.join(', ')
}
