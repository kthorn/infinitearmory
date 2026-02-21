import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create sample completed weapon for development
  const sampleWeapon = await prisma.weapon.upsert({
    where: { id: 'sample-weapon-001' },
    update: {},
    create: {
      id: 'sample-weapon-001',
      userPrompt: 'A frost-touched blade wielded by an ancient ice queen',
      options: JSON.stringify({
        ruleset: 'dnd5e',
        rarity: 'very_rare',
        style: 'fantasy_art',
      }),
      status: 'done',
      descriptionMd: `# Winterheart

This elegant longsword is forged from eternally frozen steel, its blade perpetually rimed with frost. The crossguard is shaped like crystalline snowflakes, and the grip is wrapped in white dragon leather.

Legend holds it was wielded by Queen Elara the Frozen, who sacrificed herself to seal an ancient fire demon beneath the northern glaciers.`,
      weaponSpec: JSON.stringify({
        name: 'Winterheart',
        rarity: 'very_rare',
        weaponType: 'longsword',
        properties: ['versatile'],
        damage: { dice: '1d8', type: 'slashing' },
        toHitBonus: 2,
        damageBonus: 2,
        effects: [
          {
            trigger: 'on_hit',
            description: 'Deal an additional 1d6 cold damage.',
          },
          {
            trigger: 'activated',
            description:
              'Once per day, cast Cone of Cold (DC 15) centered on yourself. You are immune to this effect.',
          },
        ],
        rulesText:
          'You have a +2 bonus to attack and damage rolls made with this magic weapon. On a hit, the target takes an extra 1d6 cold damage. Once per day, you can use an action to cast Cone of Cold (save DC 15) centered on yourself; you are immune to this casting.',
        tags: ['cold', 'frost', 'queen', 'longsword'],
      }),
      imageUrl: null, // No image for seed data
      textModel: 'seed-data',
      imageModel: null,
      promptVersion: 'v1',
    },
  })

  console.log('Created sample weapon:', sampleWeapon.id)
  console.log('Seeding complete!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
