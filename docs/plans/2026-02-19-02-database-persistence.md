# Component 2: Database & Persistence Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Set up Prisma with SQLite, define the Weapon model, and create the database client singleton.

**Architecture:** Prisma ORM with SQLite file database. Single client instance shared across requests. Migrations run at deploy time.

**Tech Stack:** Prisma 5, SQLite

**Prerequisite:** Component 1 (Core Infrastructure) must be complete. Verify `package.json`, `tsconfig.json`, and `src/` exist before starting.

**Env file policy:** Prisma CLI reads `DATABASE_URL` from `.env`. The app runtime reads from `.env.local` (which Component 1 already created with `DATABASE_URL=file:./dev.db`). After `prisma init` creates/updates `.env`, ensure it also contains `DATABASE_URL="file:./dev.db"` to match. Do not commit `.env` — it is gitignored by Component 1.

---

## Task 1: Install Prisma

**Files:**
- Modify: `package.json`

**Step 1: Install Prisma dependencies**

Run:
```bash
npm install prisma@5 --save-dev
npm install @prisma/client@5
```

Expected: prisma in devDependencies, @prisma/client in dependencies.

**Step 2: Initialize Prisma with SQLite**

Run:
```bash
npx prisma init --datasource-provider sqlite
```

Expected: Creates `prisma/schema.prisma` and updates `.env` (or creates it).

**Step 3: Verify `.env` has correct DATABASE_URL**

Ensure `.env` contains:
```
DATABASE_URL="file:./dev.db"
```

If `prisma init` set a different value, update it to match the canonical local path above (must align with `.env.local` from Component 1).

**Step 4: Add SQLite database files to .gitignore**

Append to `.gitignore`:
```
# SQLite
*.db
*.db-journal
*.db-wal
*.db-shm
```

**Step 5: Commit**

Run:
```bash
git add package.json package-lock.json prisma/schema.prisma .gitignore && git commit -m "chore: install and initialize prisma"
```

---

## Task 2: Define Weapon Schema

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: Update schema with Weapon model**

Replace contents of `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model Weapon {
  id            String   @id @default(cuid())
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  // Generation status
  status        String   @default("queued") // queued|generating_text|generating_image|done|error

  // User input
  userPrompt    String
  options       String   // JSON string: { ruleset, rarity, style, etc. }

  // Generated content (nullable until ready)
  descriptionMd String?  // Flavor text markdown
  weaponSpec    String?  // JSON string: canonical stat block
  imageUrl      String?  // S3 URL to generated image
  imagePrompt   String?  // Prompt used for image generation

  // Metadata
  textModel     String?  // e.g., "gpt-4", "claude-3"
  imageModel    String?  // e.g., "dall-e-3", "gemini-pro"
  promptVersion String   @default("v1") // For reproducibility

  // Error tracking
  errorMessage  String?

  @@index([status])
  @@index([createdAt])
}
```

**Step 2: Verify schema is valid**

Run:
```bash
npx prisma validate
```

Expected: "The schema is valid."

**Step 3: Commit**

Run:
```bash
git add prisma/schema.prisma && git commit -m "feat: define Weapon model schema"
```

---

## Task 3: Create Initial Migration

**Files:**
- Create: `prisma/migrations/*/migration.sql`

**Step 1: Generate and apply migration**

Run:
```bash
npx prisma migrate dev --name init
```

Expected: Creates migration file and applies it. SQLite database file created.

**Step 2: Verify database exists**

Run:
```bash
test -f dev.db && echo "Database exists at dev.db" || { echo "ERROR: Database file not found"; exit 1; }
```

Expected: "Database exists at dev.db".

**Step 3: Commit migration**

Run:
```bash
git add prisma/migrations && git commit -m "feat: create initial database migration"
```

---

## Task 4: Create Prisma Client Singleton

**Files:**
- Create: `src/lib/db.ts`

**Step 1: Create database client module**

Create file `src/lib/db.ts`:

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
}
```

**Step 2: Verify module compiles**

Run:
```bash
npx tsc --noEmit
```

Expected: No type errors.

**Step 3: Commit**

Run:
```bash
git add src/lib/db.ts && git commit -m "feat: add prisma client singleton"
```

---

## Task 5: Create Database Helper Types

**Files:**
- Modify: `src/types/index.ts`

**Step 1: Add Prisma types to types module**

Replace contents of `src/types/index.ts`:

```typescript
import type { Weapon } from '@prisma/client'

// Re-export environment types
export type { Env } from '@/lib/env'

// Re-export Prisma types
export type { Weapon }

// Status enum as const for type safety
export const WEAPON_STATUS = {
  QUEUED: 'queued',
  GENERATING_TEXT: 'generating_text',
  GENERATING_IMAGE: 'generating_image',
  DONE: 'done',
  ERROR: 'error',
} as const

export type WeaponStatus = (typeof WEAPON_STATUS)[keyof typeof WEAPON_STATUS]

// Weapon with parsed JSON fields (for API responses)
export type WeaponWithParsedFields = Omit<Weapon, 'options' | 'weaponSpec'> & {
  options: Record<string, unknown>
  weaponSpec: Record<string, unknown> | null
}
```

**Step 2: Verify types compile**

Run:
```bash
npx tsc --noEmit
```

Expected: No errors.

**Step 3: Commit**

Run:
```bash
git add src/types/index.ts && git commit -m "feat: add database types and status constants"
```

---

## Task 6: Create Database Test Script

**Files:**
- Create: `scripts/test-db.ts`
- Modify: `package.json`

**Step 1: Create test script**

Create file `scripts/test-db.ts`:

```typescript
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
```

**Step 2: Add tsx for running TypeScript scripts**

Run:
```bash
npm install -D tsx
```

Expected: tsx added to devDependencies.

**Step 3: Add test script to package.json**

Add to `package.json` scripts section:
```json
"db:test": "tsx scripts/test-db.ts"
```

**Step 4: Run the test script**

Run:
```bash
npm run db:test
```

Expected:
```
Testing database connection...
Created weapon: <cuid>
Found weapon: A flaming sword of justice
Deleted test weapon
Database connection test passed!
```

**Step 5: Commit**

Run:
```bash
git add scripts/test-db.ts package.json package-lock.json && git commit -m "feat: add database test script"
```

---

## Task 7: Add Prisma Scripts to package.json

**Files:**
- Modify: `package.json`

**Step 1: Add Prisma convenience scripts**

Add to `package.json` scripts section:
```json
"db:generate": "prisma generate",
"db:migrate": "prisma migrate dev",
"db:migrate:deploy": "prisma migrate deploy",
"db:studio": "prisma studio",
"db:push": "prisma db push",
"postinstall": "prisma generate || true"
```

> **Note:** The `|| true` fallback prevents `postinstall` from failing in Docker builds where `npm ci` runs before `prisma/schema.prisma` is copied. The Dockerfile in Component 12 runs `npx prisma generate` explicitly after copying source.

**Step 2: Verify scripts work**

Run:
```bash
npm run db:generate
```

Expected: Prisma Client generated successfully.

**Step 3: Commit**

Run:
```bash
git add package.json && git commit -m "chore: add prisma convenience scripts"
```

---

## Task 8: Create Seed Script

**Files:**
- Create: `prisma/seed.ts`

**Step 1: Create seed script**

Create file `prisma/seed.ts`:

```typescript
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
```

**Step 2: Add seed configuration to package.json**

Add to `package.json` scripts section:
```json
"db:seed": "tsx prisma/seed.ts"
```

Also add the Prisma seed config to `package.json` (top level, not inside scripts):
```json
"prisma": {
  "seed": "tsx prisma/seed.ts"
}
```

This allows `npx prisma db seed` to work in addition to `npm run db:seed`.

**Step 3: Run seed script**

Run:
```bash
npm run db:seed
```

Expected:
```
Seeding database...
Created sample weapon: sample-weapon-001
Seeding complete!
```

**Step 4: Commit**

Run:
```bash
git add prisma/seed.ts package.json && git commit -m "feat: add database seed script with sample weapon"
```

---

## Task 9: Final Verification

**Files:** None (verification only)

**Step 1: Run full build**

Run:
```bash
npm run build
```

Expected: Build succeeds.

**Step 2: Run database test**

Run:
```bash
npm run db:test
```

Expected: Test passes.

---

## Component 2 Complete

**Summary of what was created:**
- Prisma ORM installed and configured for SQLite
- Weapon model with all fields from spec
- Initial migration applied
- Prisma client singleton for Next.js
- Database types and status constants
- Test script for verifying database connectivity
- Seed script with sample weapon data
- Prisma convenience scripts in package.json

**Next:** Proceed to Component 3 - WeaponSpec Schema
