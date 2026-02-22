import { describe, it, expect } from 'vitest'
import { weaponSpecSchema, generationOptionsSchema, textGenerationResultSchema, chargesSchema } from '../index'

describe('weaponSpecSchema', () => {
  it('validates a complete weapon spec', () => {
    const validWeapon = {
      name: 'Flametongue',
      rarity: 'rare',
      weaponType: 'longsword',
      properties: ['versatile'],
      damage: { dice: '1d8', type: 'slashing' },
      toHitBonus: 1,
      damageBonus: 1,
      effects: [
        { trigger: 'on_hit', description: 'Deal 2d6 fire damage' },
        { trigger: 'activated', description: 'Blade ignites on command' },
      ],
      rulesText: 'You gain a +1 bonus to attack and damage rolls...',
      tags: ['fire', 'sword', 'ignite'],
    }

    const result = weaponSpecSchema.safeParse(validWeapon)
    expect(result.success).toBe(true)
  })

  it('validates a minimal weapon spec', () => {
    const minimalWeapon = {
      name: 'Simple Dagger',
      rarity: 'common',
      weaponType: 'dagger',
      damage: { dice: '1d4', type: 'piercing' },
      rulesText: 'A simple dagger.',
    }

    const result = weaponSpecSchema.safeParse(minimalWeapon)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.properties).toEqual([])
      expect(result.data.effects).toEqual([])
      expect(result.data.tags).toEqual([])
    }
  })

  it('rejects invalid damage dice format', () => {
    const invalidWeapon = {
      name: 'Bad Weapon',
      rarity: 'common',
      weaponType: 'sword',
      damage: { dice: '2', type: 'slashing' }, // Invalid format
      rulesText: 'Rules text here.',
    }

    const result = weaponSpecSchema.safeParse(invalidWeapon)
    expect(result.success).toBe(false)
  })

  it('rejects invalid rarity', () => {
    const invalidWeapon = {
      name: 'Bad Weapon',
      rarity: 'super_legendary', // Invalid
      weaponType: 'sword',
      damage: { dice: '1d6', type: 'slashing' },
      rulesText: 'Rules text here.',
    }

    const result = weaponSpecSchema.safeParse(invalidWeapon)
    expect(result.success).toBe(false)
  })

  it('rejects effects array exceeding max length', () => {
    const weapon = {
      name: 'Overloaded Weapon',
      rarity: 'rare',
      weaponType: 'sword',
      damage: { dice: '1d6', type: 'slashing' },
      effects: Array.from({ length: 11 }, (_, i) => ({
        trigger: 'on_hit',
        description: `Effect ${i}`,
      })),
      rulesText: 'Rules text here.',
    }

    const result = weaponSpecSchema.safeParse(weapon)
    expect(result.success).toBe(false)
  })

  it('rejects tags array exceeding max length', () => {
    const weapon = {
      name: 'Over-tagged Weapon',
      rarity: 'common',
      weaponType: 'sword',
      damage: { dice: '1d6', type: 'slashing' },
      tags: Array.from({ length: 21 }, (_, i) => `tag${i}`),
      rulesText: 'Rules text here.',
    }

    const result = weaponSpecSchema.safeParse(weapon)
    expect(result.success).toBe(false)
  })
})

describe('chargesSchema', () => {
  it('validates valid charges', () => {
    const result = chargesSchema.safeParse({ current: 3, max: 5, recharge: 'dawn' })
    expect(result.success).toBe(true)
  })

  it('rejects current > max', () => {
    const result = chargesSchema.safeParse({ current: 6, max: 5, recharge: 'dawn' })
    expect(result.success).toBe(false)
  })

  it('allows current equal to max', () => {
    const result = chargesSchema.safeParse({ current: 5, max: 5, recharge: 'dawn' })
    expect(result.success).toBe(true)
  })
})

describe('generationOptionsSchema', () => {
  it('provides defaults for minimal input', () => {
    const result = generationOptionsSchema.safeParse({})
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.ruleset).toBe('dnd5e')
      expect(result.data.style).toBe('fantasy_art')
    }
  })

  it('accepts full options', () => {
    const options = {
      ruleset: 'pathfinder2e',
      rarity: 'legendary',
      style: 'dark_fantasy',
      seed: 12345,
    }

    const result = generationOptionsSchema.safeParse(options)
    expect(result.success).toBe(true)
  })
})

describe('textGenerationResultSchema', () => {
  it('validates complete generation result', () => {
    const result = {
      weaponSpec: {
        name: 'Test Sword',
        rarity: 'uncommon',
        weaponType: 'shortsword',
        damage: { dice: '1d6', type: 'piercing' },
        rulesText: 'A test weapon.',
      },
      descriptionMd: '# Test Sword\n\nA magical blade...',
    }

    const parsed = textGenerationResultSchema.safeParse(result)
    expect(parsed.success).toBe(true)
  })
})
