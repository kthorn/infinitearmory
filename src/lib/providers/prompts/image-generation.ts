import type { WeaponSpec, Style } from '@/lib/schemas'

export function buildImagePrompt(weaponSpec: WeaponSpec, style: Style, userPrompt?: string, guidance?: string, previousImagePrompt?: string): string {
  const styleInstructions = getStyleInstructions(style)
  const weaponDescription = buildWeaponDescription(weaponSpec)
  const trimmedPrompt = userPrompt?.trim()
  const userVisionSection = trimmedPrompt ? `\n\nUser's vision: ${trimmedPrompt}` : ''
  const framing = getFramingInstructions(weaponSpec.category)
  const trimmedGuidance = guidance?.trim()
  const guidanceSection = trimmedGuidance ? `\n\nRefinement guidance: ${trimmedGuidance}` : ''
  const priorContext = previousImagePrompt?.trim() ? `\n\nPrevious image description: ${previousImagePrompt.trim()}` : ''

  return `${styleInstructions}${userVisionSection}${priorContext}${guidanceSection}

A detailed illustration of ${weaponDescription}

${framing} High detail, professional quality artwork. Do not include any text.`
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
    case 'technical_blueprint':
      return 'Technical blueprint style, white lines on dark blue background, schematic labels, measurement annotations, engineering drawing aesthetic.'
    case 'cyberpunk':
      return 'Cyberpunk art style, neon-lit, gritty urban aesthetic, high-tech-low-life, holographic elements, rain-slicked surfaces.'
    case 'hard_scifi':
      return 'Hard sci-fi art style, clean utilitarian design, NASA/SpaceX industrial aesthetic, matte materials, functional over decorative.'
    default:
      return 'High quality illustration.'
  }
}

function getFramingInstructions(category: string): string {
  switch (category) {
    case 'fantasy_weapon':
      return 'The weapon should be shown on a neutral background, centered in frame, with dramatic lighting that highlights its magical properties.'
    case 'scifi_handheld':
      return 'The weapon should be shown at a dynamic angle, centered in frame. Sci-fi context elements like a holographic display or armory rack in the background.'
    case 'scifi_turret':
      return 'The turret should be shown in a deployed/mounted view with environmental context. Show the mounting system and any targeting elements.'
    case 'mech':
      return 'Full mech illustration in a dynamic pose, with a human figure or vehicle for scale reference. Show weapon systems and overall silhouette clearly.'
    default:
      return 'Centered in frame with dramatic lighting.'
  }
}

function buildWeaponDescription(spec: WeaponSpec): string {
  const parts: string[] = []

  switch (spec.category) {
    case 'fantasy_weapon': {
      parts.push(`a fantasy weapon: a ${spec.rarity.replace('_', ' ')} ${spec.weaponType} called "${spec.name}"`)
      if (spec.damage.type !== 'slashing' && spec.damage.type !== 'piercing' && spec.damage.type !== 'bludgeoning') {
        parts.push(`with ${spec.damage.type} magical energy`)
      }
      break
    }
    case 'scifi_handheld': {
      parts.push(`a sci-fi weapon: a ${spec.rarity.replace('_', ' ')} ${spec.weaponClass} called "${spec.name}"`)
      parts.push(`${spec.firingMode}-fire ${spec.range}-range weapon`)
      if (spec.damage.type !== 'kinetic') {
        parts.push(`with ${spec.damage.type} energy`)
      }
      break
    }
    case 'scifi_turret': {
      parts.push(`a sci-fi turret: a ${spec.rarity.replace('_', ' ')} ${spec.mountType}-mounted turret called "${spec.name}"`)
      parts.push(`${spec.range}-range defensive emplacement`)
      if (spec.damage.type !== 'kinetic') {
        parts.push(`with ${spec.damage.type} energy`)
      }
      break
    }
    case 'mech': {
      parts.push(`a combat mech: a ${spec.rarity.replace('_', ' ')} ${spec.mechClass}-class mech called "${spec.name}"`)
      parts.push(`${spec.tonnage}-ton war machine`)
      const weaponNames = spec.weaponSystems.map((w) => w.name).slice(0, 3)
      if (weaponNames.length > 0) {
        parts.push(`armed with ${weaponNames.join(', ')}`)
      }
      break
    }
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
  const visualKeywords = [
    'glowing', 'ancient', 'crystalline', 'ornate', 'runic', 'ethereal', 'flame', 'frost', 'shadow', 'light',
    'neon', 'holographic', 'chrome', 'plasma', 'energy', 'laser', 'armored', 'stealth', 'heavy', 'sleek',
  ]
  const visualTags = spec.tags.filter((t) =>
    visualKeywords.some((v) => t.includes(v))
  )
  if (visualTags.length > 0) {
    parts.push(`(${visualTags.join(', ')})`)
  }

  return parts.join(', ')
}
