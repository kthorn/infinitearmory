import { describe, it, expect } from 'vitest'
import { buildImagePrompt } from '../image-generation'
import type { WeaponSpec } from '@/lib/schemas'

const mockSpec: WeaponSpec = {
  category: 'fantasy_weapon',
  name: 'Blazebrand',
  rarity: 'rare',
  weaponType: 'longsword',
  damage: { dice: '2d6', type: 'fire' },
  effects: [],
  rulesText: 'Deals fire damage',
  tags: ['fire', 'glowing'],
  properties: ['versatile'],
}

describe('buildImagePrompt with guidance', () => {
  it('includes guidance when provided', () => {
    const result = buildImagePrompt(mockSpec, 'fantasy_art', 'A fire sword', 'Make the flames blue and more intense')
    expect(result).toContain('Make the flames blue and more intense')
  })

  it('works without guidance (existing behavior)', () => {
    const result = buildImagePrompt(mockSpec, 'fantasy_art', 'A fire sword')
    expect(result).toContain('Blazebrand')
    expect(result).not.toContain('Refinement')
  })
})
