import { describe, it, expect } from 'vitest'
import { buildWeaponRefinementPrompt } from '../weapon-generation'

describe('buildWeaponRefinementPrompt', () => {
  const baseArgs = {
    userPrompt: 'A flaming sword',
    currentSpec: JSON.stringify({
      category: 'fantasy_weapon',
      name: 'Blazebrand',
      rarity: 'rare',
      weaponType: 'longsword',
      damage: { dice: '2d6', type: 'fire' },
      effects: [],
      rulesText: 'Deals fire damage',
      tags: ['fire'],
      properties: ['versatile'],
    }),
    currentDescription: '## Blazebrand\nA legendary sword wreathed in flame.',
    guidance: 'Make it deal more damage and add a frost effect',
    category: 'fantasy_weapon' as const,
  }

  it('includes the current weapon spec', () => {
    const prompt = buildWeaponRefinementPrompt(baseArgs)
    expect(prompt).toContain('Blazebrand')
    expect(prompt).toContain('2d6')
  })

  it('includes the user guidance', () => {
    const prompt = buildWeaponRefinementPrompt(baseArgs)
    expect(prompt).toContain('Make it deal more damage and add a frost effect')
  })

  it('includes the original user prompt', () => {
    const prompt = buildWeaponRefinementPrompt(baseArgs)
    expect(prompt).toContain('A flaming sword')
  })

  it('includes instructions to preserve unchanged fields', () => {
    const prompt = buildWeaponRefinementPrompt(baseArgs)
    expect(prompt).toMatch(/preserve|unchanged|not mentioned/i)
  })

  it('includes the current description', () => {
    const prompt = buildWeaponRefinementPrompt(baseArgs)
    expect(prompt).toContain('A legendary sword wreathed in flame')
  })

  it('includes correct schema description for the category', () => {
    const prompt = buildWeaponRefinementPrompt(baseArgs)
    expect(prompt).toContain('weaponSpec')
    expect(prompt).toContain('descriptionMd')
  })
})
