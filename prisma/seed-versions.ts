import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const weapons = await prisma.weapon.findMany({
    where: { weaponSpec: { not: null } },
  })

  console.log(`Found ${weapons.length} weapons to seed versions for`)

  for (const weapon of weapons) {
    // Check if already has versions
    const existing = await prisma.weaponVersion.findFirst({
      where: { weaponId: weapon.id },
    })
    if (existing) {
      console.log(`Skipping ${weapon.id} — already has versions`)
      continue
    }

    const version = await prisma.weaponVersion.create({
      data: {
        weaponId: weapon.id,
        versionNumber: 1,
        descriptionMd: weapon.descriptionMd,
        weaponSpec: weapon.weaponSpec,
        imageUrl: weapon.imageUrl,
        imagePrompt: weapon.imagePrompt,
        textModel: weapon.textModel,
        imageModel: weapon.imageModel,
      },
    })

    await prisma.weapon.update({
      where: { id: weapon.id },
      data: { activeVersionId: version.id },
    })

    console.log(`Seeded version for weapon ${weapon.id}`)
  }
}

main()
  .then(() => console.log('Done'))
  .catch(console.error)
  .finally(() => prisma.$disconnect())
