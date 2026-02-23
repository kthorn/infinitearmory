# Weapon Versioning Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Track every generation result (text + image) as a versioned snapshot so users can browse, compare, promote, and delete versions of a weapon.

**Architecture:** New `WeaponVersion` table stores each generation output. The `Weapon` table gets an `activeVersionId` field pointing to the currently displayed version. Reroll/regenerate create new versions instead of overwriting. The active version's data is denormalized onto the `Weapon` row for backward compatibility (existing gallery, polling, detail page all keep working). New API endpoints manage versions; the detail page gets a version strip for browsing.

**Tech Stack:** Next.js App Router, Prisma (SQLite), React 19, Tailwind CSS, TypeScript, Vitest

---

### Task 1: Add WeaponVersion Schema

Create the `WeaponVersion` model and add `activeVersionId` to `Weapon`.

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: Update the Prisma schema**

Replace the entire `prisma/schema.prisma` with:

```prisma
generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "linux-musl-openssl-3.0.x"]
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

  // Active version snapshot (denormalized for backward compat)
  descriptionMd String?  // Flavor text markdown
  weaponSpec    String?  // JSON string: canonical stat block
  imageUrl      String?  // URL to generated image
  imagePrompt   String?  // Prompt used for image generation
  textModel     String?  // e.g., "claude-sonnet-4-6"
  imageModel    String?  // e.g., "gpt-image-1"
  promptVersion String   @default("v1")

  // Error tracking
  errorMessage  String?

  // Versioning
  activeVersionId String?
  versions        WeaponVersion[]

  @@index([status])
  @@index([createdAt])
}

model WeaponVersion {
  id            String   @id @default(cuid())
  createdAt     DateTime @default(now())

  // Parent weapon
  weaponId      String
  weapon        Weapon   @relation(fields: [weaponId], references: [id], onDelete: Cascade)
  versionNumber Int

  // Generated content
  descriptionMd String?
  weaponSpec    String?  // JSON string
  imageUrl      String?
  imagePrompt   String?
  textModel     String?
  imageModel    String?

  @@unique([weaponId, versionNumber])
  @@index([weaponId])
}
```

Key decisions:
- `onDelete: Cascade` — deleting a weapon deletes all its versions
- `@@unique([weaponId, versionNumber])` — prevents duplicate version numbers
- `activeVersionId` is a plain string (not a FK) to avoid circular FK issues in SQLite

**Step 2: Generate and run the migration**

Run: `npx prisma migrate dev --name add-weapon-versions`
Expected: Migration created and applied, Prisma client regenerated.

**Step 3: Commit**

```bash
git add prisma/
git commit -m "feat: add WeaponVersion schema with migration"
```

---

### Task 2: Seed Existing Weapons into Versions

Write a migration script that creates a `WeaponVersion` (versionNumber=1) for each existing weapon that has generated content, and sets `activeVersionId`.

**Files:**
- Create: `prisma/seed-versions.ts`

**Step 1: Write the seed script**

```typescript
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
```

**Step 2: Run the seed script**

Run: `npx tsx prisma/seed-versions.ts`
Expected: Each existing weapon with content gets a version 1 row, `activeVersionId` is set.

**Step 3: Verify**

Run: `npx prisma studio`
Check the `WeaponVersion` table has rows corresponding to existing weapons.

**Step 4: Commit**

```bash
git add prisma/seed-versions.ts
git commit -m "feat: add seed script for existing weapon versions"
```

---

### Task 3: Add Version Response Schema

Add the API types for version data.

**Files:**
- Modify: `src/lib/schemas/api/weapon-response.ts`
- Modify: `src/lib/api/transform.ts`

**Step 1: Add version schema to `src/lib/schemas/api/weapon-response.ts`**

After the `weaponSummarySchema` (after line 31), add:

```typescript
export const weaponVersionSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  versionNumber: z.number(),
  weaponSpec: z.nullable(weaponSpecSchema),
  descriptionMd: z.nullable(z.string()),
  imageUrl: z.nullable(z.string()),
  textModel: z.nullable(z.string()),
  imageModel: z.nullable(z.string()),
})

export type WeaponVersion = z.infer<typeof weaponVersionSchema>
```

Also add `activeVersionId` and `versions` to `weaponResponseSchema`:

```typescript
export const weaponResponseSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  status: z.enum(['queued', 'generating_text', 'generating_image', 'done', 'error']),
  userPrompt: z.string(),
  options: z.record(z.string(), z.unknown()),
  weaponSpec: z.nullable(weaponSpecSchema),
  descriptionMd: z.nullable(z.string()),
  imageUrl: z.nullable(z.string()),
  errorMessage: z.nullable(z.string()),
  textModel: z.nullable(z.string()),
  imageModel: z.nullable(z.string()),
  activeVersionId: z.nullable(z.string()),
  versionCount: z.number(),
})
```

**Step 2: Update `toWeaponResponse` in `src/lib/api/transform.ts`**

Import `WeaponVersion as WeaponVersionRow` from `@prisma/client`. Update the function signature to accept a weapon with optional version count:

```typescript
interface WeaponWithVersionCount {
  _count?: { versions: number }
}

export function toWeaponResponse(weapon: Weapon & WeaponWithVersionCount): WeaponResponse {
  return {
    id: weapon.id,
    createdAt: weapon.createdAt.toISOString(),
    updatedAt: weapon.updatedAt.toISOString(),
    status: weapon.status as WeaponResponse['status'],
    userPrompt: weapon.userPrompt,
    options: normalizeOptions(safeJsonParse(weapon.options, {})),
    weaponSpec: normalizeWeaponSpec(safeJsonParse(weapon.weaponSpec)) as WeaponResponse['weaponSpec'],
    descriptionMd: weapon.descriptionMd,
    imageUrl: weapon.imageUrl,
    errorMessage: weapon.errorMessage,
    textModel: weapon.textModel ?? null,
    imageModel: weapon.imageModel ?? null,
    activeVersionId: weapon.activeVersionId ?? null,
    versionCount: weapon._count?.versions ?? 0,
  }
}
```

Add a new transform for version rows:

```typescript
import type { WeaponVersion as WeaponVersionRow } from '@prisma/client'
import type { WeaponVersion } from '@/lib/schemas'

export function toWeaponVersionResponse(version: WeaponVersionRow): WeaponVersion {
  return {
    id: version.id,
    createdAt: version.createdAt.toISOString(),
    versionNumber: version.versionNumber,
    weaponSpec: normalizeWeaponSpec(safeJsonParse(version.weaponSpec)) as WeaponVersion['weaponSpec'],
    descriptionMd: version.descriptionMd,
    imageUrl: version.imageUrl,
    textModel: version.textModel ?? null,
    imageModel: version.imageModel ?? null,
  }
}
```

**Step 3: Export new types from `src/lib/schemas/api/weapon-response.ts` and `src/lib/api/index.ts`**

Add `toWeaponVersionResponse` to `src/lib/api/index.ts`:

```typescript
export { toWeaponResponse, toWeaponSummary, toWeaponVersionResponse } from './transform'
```

**Step 4: Update all `db.weapon.findUnique` calls that feed `toWeaponResponse`**

In these files, add `include: { _count: { select: { versions: true } } }` to the query:

- `src/app/api/weapons/[id]/route.ts:16` — GET handler
- `src/app/api/weapons/[id]/route.ts:35` — DELETE handler (this one returns `{ success: true }` so no change needed)
- `src/app/api/weapons/[id]/regenerate-image/route.ts:57` — the "return updated" query
- `src/app/api/weapons/[id]/reroll-stats/route.ts:30` — the "return updated" query

For example in `src/app/api/weapons/[id]/route.ts` GET handler, change:
```typescript
const weapon = await db.weapon.findUnique({ where: { id } })
```
to:
```typescript
const weapon = await db.weapon.findUnique({
  where: { id },
  include: { _count: { select: { versions: true } } },
})
```

Also update the list endpoint in `src/app/api/weapons/route.ts` — the `findMany` for list does NOT need versions (it uses `toWeaponSummary` which doesn't include version data).

**Step 5: Run type-check**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 6: Run existing tests**

Run: `npx vitest run`
Expected: All tests pass. Tests mock `db.weapon.findUnique` so they should still work — the `_count` field will just be undefined, which we handle with `?? 0`.

**Step 7: Commit**

```bash
git add src/lib/schemas/api/weapon-response.ts src/lib/api/transform.ts src/lib/api/index.ts src/app/api/weapons/
git commit -m "feat: add WeaponVersion response types and include version count"
```

---

### Task 4: Create Version on Generation Complete

Update the orchestrator to create a `WeaponVersion` row whenever generation completes, and set `activeVersionId`.

**Files:**
- Modify: `src/lib/generation/orchestrator.ts`

**Step 1: Add helper to create a version and sync to weapon**

Add this function at the bottom of `orchestrator.ts` (before the `updateStatus` function):

```typescript
/**
 * Create a new version snapshot and set it as active on the weapon.
 */
async function createVersionAndActivate(weaponId: string): Promise<void> {
  const weapon = await db.weapon.findUnique({ where: { id: weaponId } })
  if (!weapon) return

  // Determine next version number
  const lastVersion = await db.weaponVersion.findFirst({
    where: { weaponId },
    orderBy: { versionNumber: 'desc' },
  })
  const versionNumber = (lastVersion?.versionNumber ?? 0) + 1

  const version = await db.weaponVersion.create({
    data: {
      weaponId,
      versionNumber,
      descriptionMd: weapon.descriptionMd,
      weaponSpec: weapon.weaponSpec,
      imageUrl: weapon.imageUrl,
      imagePrompt: weapon.imagePrompt,
      textModel: weapon.textModel,
      imageModel: weapon.imageModel,
    },
  })

  await db.weapon.update({
    where: { id: weaponId },
    data: { activeVersionId: version.id },
  })
}
```

**Step 2: Call it in `generateWeapon` after marking done**

In the `generateWeapon` function, after the final `db.weapon.update` that sets `status: WEAPON_STATUS.DONE` (around line 71-79), add:

```typescript
    // Create version snapshot
    await createVersionAndActivate(weaponId)
```

**Step 3: Call it in `regenerateImage` after marking done**

In the `regenerateImage` function, after the `db.weapon.update` that sets `status: WEAPON_STATUS.DONE` (around line 137-145), add:

```typescript
    // Create version snapshot
    await createVersionAndActivate(weaponId)
```

**Step 4: Update `rerollWeapon` — don't clear existing data until generation starts**

The `rerollWeapon` function currently clears all fields before regenerating. With versioning, the previous data is preserved in versions, so we still clear the weapon row (this is fine — the version table has the history). No change needed here — `generateWeapon` will create the new version when done.

**Step 5: Run type-check**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 6: Commit**

```bash
git add src/lib/generation/orchestrator.ts
git commit -m "feat: create WeaponVersion on generation complete"
```

---

### Task 5: Version List API Endpoint

Add `GET /api/weapons/:id/versions` to list all versions for a weapon.

**Files:**
- Create: `src/app/api/weapons/[id]/versions/route.ts`

**Step 1: Write the failing test**

Create `src/app/api/weapons/__tests__/versions.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/db', () => ({
  db: {
    weapon: { findUnique: vi.fn() },
    weaponVersion: { findMany: vi.fn() },
  },
}))

const { db } = await import('@/lib/db')

describe('GET /api/weapons/:id/versions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 404 if weapon not found', async () => {
    vi.mocked(db.weapon.findUnique).mockResolvedValue(null)
    const { GET } = await import('@/app/api/weapons/[id]/versions/route')
    const request = new NextRequest('http://localhost/api/weapons/missing/versions')
    const response = await GET(request, { params: Promise.resolve({ id: 'missing' }) })
    expect(response.status).toBe(404)
  })

  it('returns versions for a weapon', async () => {
    vi.mocked(db.weapon.findUnique).mockResolvedValue({ id: 'w1' } as never)
    vi.mocked(db.weaponVersion.findMany).mockResolvedValue([
      {
        id: 'v1',
        createdAt: new Date('2026-01-01'),
        weaponId: 'w1',
        versionNumber: 1,
        descriptionMd: 'desc',
        weaponSpec: '{"category":"fantasy_weapon","name":"Sword"}',
        imageUrl: '/uploads/weapons/w1/img.png',
        imagePrompt: 'a sword',
        textModel: 'claude-sonnet-4-6',
        imageModel: 'gpt-image-1',
      },
    ] as never)

    const { GET } = await import('@/app/api/weapons/[id]/versions/route')
    const request = new NextRequest('http://localhost/api/weapons/w1/versions')
    const response = await GET(request, { params: Promise.resolve({ id: 'w1' }) })
    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data.versions).toHaveLength(1)
    expect(data.versions[0].versionNumber).toBe(1)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/api/weapons/__tests__/versions.test.ts`
Expected: FAIL — module not found.

**Step 3: Write the route handler**

Create `src/app/api/weapons/[id]/versions/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { notFound, serverError, toWeaponVersionResponse } from '@/lib/api'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/weapons/:id/versions - List all versions for a weapon
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    const weapon = await db.weapon.findUnique({ where: { id } })
    if (!weapon) {
      return notFound('Weapon not found')
    }

    const versions = await db.weaponVersion.findMany({
      where: { weaponId: id },
      orderBy: { versionNumber: 'desc' },
    })

    return NextResponse.json({
      versions: versions.map(toWeaponVersionResponse),
      activeVersionId: weapon.activeVersionId,
    })
  } catch (error) {
    console.error('GET /api/weapons/:id/versions error:', error)
    return serverError('Failed to list versions')
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/api/weapons/__tests__/versions.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/app/api/weapons/\[id\]/versions/route.ts src/app/api/weapons/__tests__/versions.test.ts
git commit -m "feat: add GET /api/weapons/:id/versions endpoint"
```

---

### Task 6: Promote Version API Endpoint

Add `POST /api/weapons/:id/versions/:versionId/promote` to make a version the active one.

**Files:**
- Create: `src/app/api/weapons/[id]/versions/[versionId]/promote/route.ts`

**Step 1: Write the failing test**

Create `src/app/api/weapons/__tests__/promote-version.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/db', () => ({
  db: {
    weapon: { findUnique: vi.fn(), update: vi.fn() },
    weaponVersion: { findUnique: vi.fn() },
  },
}))

const { db } = await import('@/lib/db')

describe('POST /api/weapons/:id/versions/:versionId/promote', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 404 if version not found', async () => {
    vi.mocked(db.weapon.findUnique).mockResolvedValue({ id: 'w1' } as never)
    vi.mocked(db.weaponVersion.findUnique).mockResolvedValue(null)

    const { POST } = await import('@/app/api/weapons/[id]/versions/[versionId]/promote/route')
    const request = new NextRequest('http://localhost/api/weapons/w1/versions/missing/promote', { method: 'POST' })
    const response = await POST(request, { params: Promise.resolve({ id: 'w1', versionId: 'missing' }) })
    expect(response.status).toBe(404)
  })

  it('promotes version and syncs data to weapon', async () => {
    vi.mocked(db.weapon.findUnique).mockResolvedValue({ id: 'w1' } as never)
    vi.mocked(db.weaponVersion.findUnique).mockResolvedValue({
      id: 'v2',
      weaponId: 'w1',
      versionNumber: 2,
      descriptionMd: 'new desc',
      weaponSpec: '{"category":"fantasy_weapon","name":"Better Sword"}',
      imageUrl: '/img2.png',
      imagePrompt: 'better sword',
      textModel: 'gpt-5',
      imageModel: 'gpt-image-1',
      createdAt: new Date(),
    } as never)
    vi.mocked(db.weapon.update).mockResolvedValue({} as never)

    const { POST } = await import('@/app/api/weapons/[id]/versions/[versionId]/promote/route')
    const request = new NextRequest('http://localhost/api/weapons/w1/versions/v2/promote', { method: 'POST' })
    const response = await POST(request, { params: Promise.resolve({ id: 'w1', versionId: 'v2' }) })
    expect(response.status).toBe(200)

    expect(db.weapon.update).toHaveBeenCalledWith({
      where: { id: 'w1' },
      data: expect.objectContaining({
        activeVersionId: 'v2',
        weaponSpec: '{"category":"fantasy_weapon","name":"Better Sword"}',
        descriptionMd: 'new desc',
        imageUrl: '/img2.png',
        imagePrompt: 'better sword',
        textModel: 'gpt-5',
        imageModel: 'gpt-image-1',
      }),
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/api/weapons/__tests__/promote-version.test.ts`
Expected: FAIL.

**Step 3: Write the route handler**

Create `src/app/api/weapons/[id]/versions/[versionId]/promote/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { badRequest, notFound, serverError, toWeaponResponse } from '@/lib/api'

interface RouteParams {
  params: Promise<{ id: string; versionId: string }>
}

/**
 * POST /api/weapons/:id/versions/:versionId/promote
 * Set a version as the active version, syncing its data to the weapon row.
 */
export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id, versionId } = await params

    const weapon = await db.weapon.findUnique({ where: { id } })
    if (!weapon) {
      return notFound('Weapon not found')
    }

    const version = await db.weaponVersion.findUnique({ where: { id: versionId } })
    if (!version) {
      return notFound('Version not found')
    }
    if (version.weaponId !== id) {
      return badRequest('Version does not belong to this weapon')
    }

    // Sync version data to weapon row
    const updated = await db.weapon.update({
      where: { id },
      data: {
        activeVersionId: version.id,
        weaponSpec: version.weaponSpec,
        descriptionMd: version.descriptionMd,
        imageUrl: version.imageUrl,
        imagePrompt: version.imagePrompt,
        textModel: version.textModel,
        imageModel: version.imageModel,
      },
      include: { _count: { select: { versions: true } } },
    })

    return NextResponse.json(toWeaponResponse(updated))
  } catch (error) {
    console.error('POST /api/weapons/:id/versions/:versionId/promote error:', error)
    return serverError('Failed to promote version')
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/api/weapons/__tests__/promote-version.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/app/api/weapons/\[id\]/versions/ src/app/api/weapons/__tests__/promote-version.test.ts
git commit -m "feat: add POST promote version endpoint"
```

---

### Task 7: Delete Version API Endpoint

Add `DELETE /api/weapons/:id/versions/:versionId` to delete a specific version. Cannot delete the active version (must promote another first).

**Files:**
- Create: `src/app/api/weapons/[id]/versions/[versionId]/route.ts`

**Step 1: Write the failing test**

Create `src/app/api/weapons/__tests__/delete-version.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/db', () => ({
  db: {
    weapon: { findUnique: vi.fn() },
    weaponVersion: { findUnique: vi.fn(), delete: vi.fn() },
  },
}))

vi.mock('@/lib/storage', () => ({
  deleteImage: vi.fn(),
}))

const { db } = await import('@/lib/db')
const { deleteImage } = await import('@/lib/storage')

describe('DELETE /api/weapons/:id/versions/:versionId', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 404 if version not found', async () => {
    vi.mocked(db.weapon.findUnique).mockResolvedValue({ id: 'w1', activeVersionId: 'v1' } as never)
    vi.mocked(db.weaponVersion.findUnique).mockResolvedValue(null)

    const { DELETE } = await import('@/app/api/weapons/[id]/versions/[versionId]/route')
    const request = new NextRequest('http://localhost/api/weapons/w1/versions/missing', { method: 'DELETE' })
    const response = await DELETE(request, { params: Promise.resolve({ id: 'w1', versionId: 'missing' }) })
    expect(response.status).toBe(404)
  })

  it('rejects deleting the active version', async () => {
    vi.mocked(db.weapon.findUnique).mockResolvedValue({ id: 'w1', activeVersionId: 'v1' } as never)
    vi.mocked(db.weaponVersion.findUnique).mockResolvedValue({ id: 'v1', weaponId: 'w1' } as never)

    const { DELETE } = await import('@/app/api/weapons/[id]/versions/[versionId]/route')
    const request = new NextRequest('http://localhost/api/weapons/w1/versions/v1', { method: 'DELETE' })
    const response = await DELETE(request, { params: Promise.resolve({ id: 'w1', versionId: 'v1' }) })
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toMatch(/active/)
  })

  it('deletes version and cleans up image', async () => {
    vi.mocked(db.weapon.findUnique).mockResolvedValue({ id: 'w1', activeVersionId: 'v1' } as never)
    vi.mocked(db.weaponVersion.findUnique).mockResolvedValue({
      id: 'v2',
      weaponId: 'w1',
      imageUrl: '/uploads/weapons/w1/img.png',
    } as never)
    vi.mocked(db.weaponVersion.delete).mockResolvedValue({} as never)

    const { DELETE } = await import('@/app/api/weapons/[id]/versions/[versionId]/route')
    const request = new NextRequest('http://localhost/api/weapons/w1/versions/v2', { method: 'DELETE' })
    const response = await DELETE(request, { params: Promise.resolve({ id: 'w1', versionId: 'v2' }) })
    expect(response.status).toBe(200)
    expect(deleteImage).toHaveBeenCalledWith('/uploads/weapons/w1/img.png')
    expect(db.weaponVersion.delete).toHaveBeenCalledWith({ where: { id: 'v2' } })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/api/weapons/__tests__/delete-version.test.ts`
Expected: FAIL.

**Step 3: Write the route handler**

Create `src/app/api/weapons/[id]/versions/[versionId]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { badRequest, notFound, serverError } from '@/lib/api'
import { deleteImage } from '@/lib/storage'

interface RouteParams {
  params: Promise<{ id: string; versionId: string }>
}

/**
 * DELETE /api/weapons/:id/versions/:versionId
 * Delete a specific version. Cannot delete the active version.
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id, versionId } = await params

    const weapon = await db.weapon.findUnique({ where: { id } })
    if (!weapon) {
      return notFound('Weapon not found')
    }

    const version = await db.weaponVersion.findUnique({ where: { id: versionId } })
    if (!version) {
      return notFound('Version not found')
    }
    if (version.weaponId !== id) {
      return badRequest('Version does not belong to this weapon')
    }
    if (weapon.activeVersionId === versionId) {
      return badRequest('Cannot delete the active version. Promote another version first.')
    }

    // Clean up image file
    if (version.imageUrl) {
      await deleteImage(version.imageUrl)
    }

    await db.weaponVersion.delete({ where: { id: versionId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/weapons/:id/versions/:versionId error:', error)
    return serverError('Failed to delete version')
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/api/weapons/__tests__/delete-version.test.ts`
Expected: PASS.

**Step 5: Commit**

```bash
git add src/app/api/weapons/\[id\]/versions/ src/app/api/weapons/__tests__/delete-version.test.ts
git commit -m "feat: add DELETE version endpoint with image cleanup"
```

---

### Task 8: Update Weapon Delete to Clean Up Version Images

When deleting a weapon, we need to delete images from all versions, not just the active one.

**Files:**
- Modify: `src/app/api/weapons/[id]/route.ts:32-52`

**Step 1: Update the DELETE handler**

Replace the DELETE handler in `src/app/api/weapons/[id]/route.ts`:

```typescript
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const weapon = await db.weapon.findUnique({
      where: { id },
      include: { versions: { select: { imageUrl: true } } },
    })

    if (!weapon) {
      return notFound('Weapon not found')
    }

    // Collect all unique image URLs from weapon + versions
    const imageUrls = new Set<string>()
    if (weapon.imageUrl) imageUrls.add(weapon.imageUrl)
    for (const version of weapon.versions) {
      if (version.imageUrl) imageUrls.add(version.imageUrl)
    }

    // Delete all images
    for (const url of imageUrls) {
      await deleteImage(url)
    }

    // Cascade delete handles versions
    await db.weapon.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/weapons/:id error:', error)
    return serverError('Failed to delete weapon')
  }
}
```

**Step 2: Update the delete weapon test**

In `src/app/api/weapons/__tests__/delete-weapon.test.ts`, update the mock to include `versions` in the `findUnique` result. If the test uses a mock weapon without `versions`, add `versions: []` to it.

**Step 3: Run tests**

Run: `npx vitest run src/app/api/weapons/__tests__/delete-weapon.test.ts`
Expected: PASS.

**Step 4: Commit**

```bash
git add src/app/api/weapons/\[id\]/route.ts src/app/api/weapons/__tests__/delete-weapon.test.ts
git commit -m "feat: clean up all version images when deleting weapon"
```

---

### Task 9: Version Strip UI Component

Add a version strip to the weapon detail page showing thumbnails of all versions with promote/delete controls.

**Files:**
- Create: `src/components/version-strip.tsx`
- Modify: `src/components/index.ts`
- Modify: `src/components/weapon-card.tsx`

**Step 1: Create the VersionStrip component**

Create `src/components/version-strip.tsx`:

```tsx
'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Button } from './ui'
import type { WeaponVersion } from '@/lib/schemas'
import { getModelLabel } from '@/lib/models'

interface VersionStripProps {
  versions: WeaponVersion[]
  activeVersionId: string | null
  onPromote: (versionId: string) => Promise<void>
  onDelete: (versionId: string) => Promise<void>
}

export function VersionStrip({ versions, activeVersionId, onPromote, onDelete }: VersionStripProps) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null)

  if (versions.length <= 1) return null

  async function handlePromote(versionId: string) {
    setLoadingAction(versionId)
    try {
      await onPromote(versionId)
    } finally {
      setLoadingAction(null)
    }
  }

  async function handleDelete(versionId: string) {
    if (!window.confirm('Delete this version? This cannot be undone.')) return
    setLoadingAction(versionId)
    try {
      await onDelete(versionId)
    } finally {
      setLoadingAction(null)
    }
  }

  return (
    <div className="border-t border-slate-700 bg-slate-800/30">
      <div className="px-4 py-2">
        <p className="text-xs text-slate-500 mb-2">Versions ({versions.length})</p>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {versions.map((version) => {
            const isActive = version.id === activeVersionId
            return (
              <div
                key={version.id}
                className={`flex-shrink-0 w-20 rounded border ${
                  isActive
                    ? 'border-indigo-500 ring-1 ring-indigo-500/50'
                    : 'border-slate-700 hover:border-slate-500'
                } overflow-hidden group relative`}
              >
                {/* Thumbnail */}
                <div className="relative aspect-square bg-slate-900">
                  {version.imageUrl ? (
                    <Image
                      src={version.imageUrl}
                      alt={`Version ${version.versionNumber}`}
                      fill
                      className="object-contain"
                      sizes="80px"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-600 text-xs">
                      No img
                    </div>
                  )}
                </div>

                {/* Version info */}
                <div className="px-1 py-0.5 text-center">
                  <span className="text-xs text-slate-400">v{version.versionNumber}</span>
                  {isActive && (
                    <span className="ml-1 text-xs text-indigo-400">✓</span>
                  )}
                </div>

                {/* Hover actions (non-active versions only) */}
                {!isActive && (
                  <div className="absolute inset-0 bg-slate-900/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                    <button
                      type="button"
                      onClick={() => handlePromote(version.id)}
                      disabled={loadingAction !== null}
                      className="text-xs text-indigo-400 hover:text-indigo-300 px-2 py-0.5 rounded bg-slate-800"
                    >
                      Use
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(version.id)}
                      disabled={loadingAction !== null}
                      className="text-xs text-red-400 hover:text-red-300 px-2 py-0.5 rounded bg-slate-800"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
```

**Step 2: Export from `src/components/index.ts`**

Add:
```typescript
export { VersionStrip } from './version-strip'
```

**Step 3: Commit**

```bash
git add src/components/version-strip.tsx src/components/index.ts
git commit -m "feat: add VersionStrip component for browsing weapon versions"
```

---

### Task 10: Integrate Version Strip into Weapon Detail Page

Wire up the version strip to the detail page with data fetching and actions.

**Files:**
- Modify: `src/app/weapons/[id]/weapon-detail-client.tsx`
- Modify: `src/components/weapon-card.tsx`

**Step 1: Fetch versions and pass to WeaponCard**

Update `src/app/weapons/[id]/weapon-detail-client.tsx`. Add state for versions, fetch them when weapon is done, and wire up promote/delete handlers:

```tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { WeaponCard, GenerationProgress, Button } from '@/components'
import { useWeaponPolling } from '@/hooks'
import type { WeaponResponse, WeaponVersion } from '@/lib/schemas'

interface WeaponDetailClientProps {
  initialWeapon: WeaponResponse
}

export function WeaponDetailClient({ initialWeapon }: WeaponDetailClientProps) {
  const router = useRouter()
  const { weapon, error: pollingError, refetch } = useWeaponPolling({ initialWeapon })
  const [versions, setVersions] = useState<WeaponVersion[]>([])

  const isGenerating = weapon.status !== 'done' && weapon.status !== 'error'

  const fetchVersions = useCallback(async () => {
    if (weapon.status !== 'done') return
    try {
      const response = await fetch(`/api/weapons/${weapon.id}/versions`)
      if (response.ok) {
        const data = await response.json()
        setVersions(data.versions)
      }
    } catch {
      // Silently fail — version strip is non-critical
    }
  }, [weapon.id, weapon.status])

  useEffect(() => {
    fetchVersions()
  }, [fetchVersions])

  async function handleRegenerateImage() {
    const response = await fetch(`/api/weapons/${weapon.id}/regenerate-image`, { method: 'POST' })
    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      throw new Error(data.error || 'Failed to regenerate image')
    }
    await refetch()
    await fetchVersions()
  }

  async function handleRerollStats() {
    const response = await fetch(`/api/weapons/${weapon.id}/reroll-stats`, { method: 'POST' })
    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      throw new Error(data.error || 'Failed to reroll stats')
    }
    router.refresh()
  }

  async function handleDelete() {
    const response = await fetch(`/api/weapons/${weapon.id}`, { method: 'DELETE' })
    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      throw new Error(data.error || 'Failed to delete weapon')
    }
    router.push('/weapons')
  }

  async function handlePromoteVersion(versionId: string) {
    const response = await fetch(`/api/weapons/${weapon.id}/versions/${versionId}/promote`, {
      method: 'POST',
    })
    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      throw new Error(data.error || 'Failed to promote version')
    }
    await refetch()
    await fetchVersions()
  }

  async function handleDeleteVersion(versionId: string) {
    const response = await fetch(`/api/weapons/${weapon.id}/versions/${versionId}`, {
      method: 'DELETE',
    })
    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      throw new Error(data.error || 'Failed to delete version')
    }
    await fetchVersions()
  }

  if (isGenerating) {
    return (
      <div>
        <GenerationProgress status={weapon.status} />
        {pollingError && (
          <p className="text-center text-sm text-red-400 mt-4">
            Having trouble checking status. Retrying...
          </p>
        )}
      </div>
    )
  }

  if (weapon.status === 'error') {
    const retryUrl = `/?prompt=${encodeURIComponent(weapon.userPrompt)}`
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-red-400 mb-4">Generation Failed</h2>
        <p className="text-slate-400 mb-6">Something went wrong during generation. Please try again.</p>
        <Button onClick={() => router.push(retryUrl)}>
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <WeaponCard
      weapon={weapon}
      versions={versions}
      onRegenerateImage={handleRegenerateImage}
      onRerollStats={handleRerollStats}
      onDelete={handleDelete}
      onPromoteVersion={handlePromoteVersion}
      onDeleteVersion={handleDeleteVersion}
    />
  )
}
```

**Step 2: Update WeaponCard to accept and render versions**

In `src/components/weapon-card.tsx`:

Add imports:
```tsx
import { VersionStrip } from './version-strip'
import type { WeaponVersion } from '@/lib/schemas'
```

Update the props interface:
```typescript
interface WeaponCardProps {
  weapon: WeaponResponse
  versions?: WeaponVersion[]
  onRegenerateImage?: () => Promise<void>
  onRerollStats?: () => Promise<void>
  onDelete?: () => Promise<void>
  onPromoteVersion?: (versionId: string) => Promise<void>
  onDeleteVersion?: (versionId: string) => Promise<void>
}
```

Update the destructuring:
```typescript
export function WeaponCard({
  weapon,
  versions = [],
  onRegenerateImage,
  onRerollStats,
  onDelete,
  onPromoteVersion,
  onDeleteVersion,
}: WeaponCardProps) {
```

Add the version strip right before the closing `</Card>` tag (before line 195), after the grid div closes:

```tsx
      </div>
      {/* Version history */}
      {versions.length > 1 && onPromoteVersion && onDeleteVersion && (
        <VersionStrip
          versions={versions}
          activeVersionId={weapon.activeVersionId ?? null}
          onPromote={onPromoteVersion}
          onDelete={onDeleteVersion}
        />
      )}
    </Card>
```

Note: This requires `activeVersionId` on `WeaponResponse`. We added that in Task 3.

**Step 3: Export `WeaponVersion` type from schemas**

In `src/lib/schemas/api/weapon-response.ts`, ensure `WeaponVersion` is exported. Then check the barrel export in `src/lib/schemas/index.ts` — it should already re-export everything from `./api/weapon-response`.

**Step 4: Run type-check**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 5: Verify manually**

Run: `npm run dev`
1. Generate a weapon
2. Click "New Image" to regenerate — this should create version 2
3. The version strip should appear at the bottom of the card with two thumbnails
4. Hover a non-active version to see "Use" and "Delete" buttons
5. Click "Use" to promote it — weapon should update to show that version's content
6. Click "Delete" on a non-active version — it should be removed from the strip

**Step 6: Commit**

```bash
git add src/app/weapons/\[id\]/weapon-detail-client.tsx src/components/weapon-card.tsx src/lib/schemas/
git commit -m "feat: integrate version strip into weapon detail page"
```

---

### Task 11: Final Type-Check, Lint, and Test Run

**Step 1: Run type-check**

Run: `npx tsc --noEmit`
Expected: No errors.

**Step 2: Run linter**

Run: `npm run lint`
Expected: No errors.

**Step 3: Run all tests**

Run: `npx vitest run`
Expected: All tests pass, including the new version tests.

**Step 4: Fix any issues**

If issues arise, fix and commit:

```bash
git add -A
git commit -m "fix: resolve type/lint issues from versioning feature"
```
