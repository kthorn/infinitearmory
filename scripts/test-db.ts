import { db } from '../src/lib/db'

async function main() {
  console.log('Testing database connection...')

  // Create a test weapon
  const weapon = await db.weapon.create({
    data: {
      userPrompt: 'A flaming sword of justice',
      options: JSON.stringify({ ruleset: 'dnd5e', rarity: 'rare' }),
      status: 'queued',
    },
  })
  console.log('Created weapon:', weapon.id)

  // Read it back
  const found = await db.weapon.findUnique({ where: { id: weapon.id } })
  console.log('Found weapon:', found?.userPrompt)

  // Delete it
  await db.weapon.delete({ where: { id: weapon.id } })
  console.log('Deleted test weapon')

  console.log('Database connection test passed!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
