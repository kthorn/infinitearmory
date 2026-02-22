import { describe, it, expect } from 'vitest'
import { buildImagePrompt } from '../image-generation'
import type { WeaponSpec } from '@/lib/schemas'

const mockWeaponSpec: WeaponSpec = {
  name: 'Flamebrand',
  weaponType: 'longsword',
  rarity: 'rare',
  damage: { dice: '2d6', type: 'fire' },
  properties: [],
  effects: [
    { trigger: 'on_hit', description: 'Wreathed in flames on hit' },
  ],
  rulesText: 'A longsword wreathed in magical fire. Deals 2d6 fire damage on hit.',
  tags: ['glowing', 'flame'],
}

describe('buildImagePrompt', () => {
  it('includes user prompt when provided', () => {
    const result = buildImagePrompt(mockWeaponSpec, 'fantasy_art', 'a curved blade with a dragon-shaped hilt')
    expect(result).toContain("User's vision: a curved blade with a dragon-shaped hilt")
  })

  it('places user prompt before weapon description', () => {
    const result = buildImagePrompt(mockWeaponSpec, 'fantasy_art', 'blue crystal sword')
    const userVisionIndex = result.indexOf("User's vision:")
    const weaponDescIndex = result.indexOf('A detailed illustration')
    expect(userVisionIndex).toBeLessThan(weaponDescIndex)
  })

  it('omits user vision section when userPrompt is empty', () => {
    const result = buildImagePrompt(mockWeaponSpec, 'fantasy_art', '')
    expect(result).not.toContain("User's vision:")
  })

  it('omits user vision section when userPrompt is undefined', () => {
    const result = buildImagePrompt(mockWeaponSpec, 'fantasy_art')
    expect(result).not.toContain("User's vision:")
  })

  it('still includes style instructions and weapon description', () => {
    const result = buildImagePrompt(mockWeaponSpec, 'dark_fantasy', 'glowing purple dagger')
    expect(result).toContain('Dark fantasy art style')
    expect(result).toContain('Flamebrand')
    expect(result).toContain("User's vision: glowing purple dagger")
  })
})
