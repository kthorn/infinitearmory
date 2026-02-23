import { describe, it, expect } from 'vitest'
import { weaponSpecSchema, generationOptionsSchema, textGenerationResultSchema, chargesSchema } from '../index'

describe('weaponSpecSchema', () => {
  it('validates a complete fantasy weapon spec', () => {
    const validWeapon = {
      category: 'fantasy_weapon',
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

  it('validates a minimal fantasy weapon spec', () => {
    const minimalWeapon = {
      category: 'fantasy_weapon',
      name: 'Simple Dagger',
      rarity: 'common',
      weaponType: 'dagger',
      damage: { dice: '1d4', type: 'piercing' },
      rulesText: 'A simple dagger.',
    }

    const result = weaponSpecSchema.safeParse(minimalWeapon)
    expect(result.success).toBe(true)
    if (result.success && result.data.category === 'fantasy_weapon') {
      expect(result.data.properties).toEqual([])
      expect(result.data.effects).toEqual([])
      expect(result.data.tags).toEqual([])
    }
  })

  it('validates a sci-fi handheld spec', () => {
    const handheld = {
      category: 'scifi_handheld',
      name: 'Plasma Repeater',
      rarity: 'uncommon',
      weaponClass: 'rifle',
      firingMode: 'burst',
      ammoCapacity: 30,
      range: 'medium',
      damage: { dice: '2d6', type: 'plasma' },
      rulesText: 'A standard-issue plasma rifle.',
      effects: [],
      tags: ['plasma'],
    }

    const result = weaponSpecSchema.safeParse(handheld)
    expect(result.success).toBe(true)
  })

  it('validates a turret spec', () => {
    const turret = {
      category: 'scifi_turret',
      name: 'Sentinel MK-IV',
      rarity: 'rare',
      mountType: 'tracking',
      firingMode: 'auto',
      range: 'long',
      rateOfFire: '3 rounds/turn',
      damage: { dice: '3d8', type: 'laser' },
      rulesText: 'An automated tracking turret.',
      effects: [],
      tags: [],
    }

    const result = weaponSpecSchema.safeParse(turret)
    expect(result.success).toBe(true)
  })

  it('validates a mech spec', () => {
    const mech = {
      category: 'mech',
      name: 'Atlas AS7-D',
      rarity: 'legendary',
      mechClass: 'assault',
      tonnage: 100,
      armorRating: 400,
      heatCapacity: 30,
      mobility: { speed: 3, jumpJets: false },
      weaponSystems: [
        { name: 'AC/20', damage: { dice: '4d10', type: 'kinetic' }, location: 'right torso', heatGenerated: 7 },
        { name: 'Medium Laser', damage: { dice: '1d8', type: 'laser' }, location: 'left arm', heatGenerated: 3 },
      ],
      specialSystems: ['Targeting Computer'],
      damage: { dice: '4d10', type: 'kinetic' },
      rulesText: 'A 100-ton assault mech.',
      effects: [],
      tags: ['assault', 'heavy'],
    }

    const result = weaponSpecSchema.safeParse(mech)
    expect(result.success).toBe(true)
  })

  it('rejects invalid damage dice format', () => {
    const invalidWeapon = {
      category: 'fantasy_weapon',
      name: 'Bad Weapon',
      rarity: 'common',
      weaponType: 'sword',
      damage: { dice: '2', type: 'slashing' },
      rulesText: 'Rules text here.',
    }

    const result = weaponSpecSchema.safeParse(invalidWeapon)
    expect(result.success).toBe(false)
  })

  it('rejects invalid rarity', () => {
    const invalidWeapon = {
      category: 'fantasy_weapon',
      name: 'Bad Weapon',
      rarity: 'super_legendary',
      weaponType: 'sword',
      damage: { dice: '1d6', type: 'slashing' },
      rulesText: 'Rules text here.',
    }

    const result = weaponSpecSchema.safeParse(invalidWeapon)
    expect(result.success).toBe(false)
  })

  it('rejects effects array exceeding max length', () => {
    const weapon = {
      category: 'fantasy_weapon',
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
      category: 'fantasy_weapon',
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

  it('rejects mech with no weapon systems', () => {
    const mech = {
      category: 'mech',
      name: 'Empty Mech',
      rarity: 'common',
      mechClass: 'light',
      tonnage: 20,
      armorRating: 50,
      heatCapacity: 10,
      mobility: { speed: 8, jumpJets: true },
      weaponSystems: [],
      damage: { dice: '1d4', type: 'kinetic' },
      rulesText: 'A mech with no weapons.',
    }

    const result = weaponSpecSchema.safeParse(mech)
    expect(result.success).toBe(false)
  })

  it('rejects unknown category', () => {
    const weapon = {
      category: 'spaceship',
      name: 'Bad Category',
      rarity: 'common',
      damage: { dice: '1d6', type: 'kinetic' },
      rulesText: 'Not a valid category.',
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
      expect(result.data.category).toBe('fantasy_weapon')
      expect(result.data.ruleset).toBe('dnd5e')
      expect(result.data.style).toBe('fantasy_art')
    }
  })

  it('accepts full options', () => {
    const options = {
      category: 'scifi_handheld',
      ruleset: 'generic_scifi',
      rarity: 'legendary',
      style: 'cyberpunk',
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
        category: 'fantasy_weapon',
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
