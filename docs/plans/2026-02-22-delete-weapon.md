# Delete Weapon Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add the ability to delete weapons from both the detail page and gallery list, including cleanup of locally stored images.

**Architecture:** Add a DELETE API endpoint that removes the image file then the DB record. Add delete buttons to the weapon card footer and as an overlay on gallery list items. Use `window.confirm()` for confirmation.

**Tech Stack:** Next.js API routes, Prisma, local file storage, React client components

---

### Task 1: DELETE API endpoint

**Files:**
- Modify: `src/app/api/weapons/[id]/route.ts`
- Create: `src/app/api/weapons/__tests__/delete-weapon.test.ts`

**Step 1: Write the failing test**

```ts
// src/app/api/weapons/__tests__/delete-weapon.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { DELETE } from '@/app/api/weapons/[id]/route'

vi.mock('@/lib/db', () => ({
  db: {
    weapon: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

vi.mock('@/lib/storage', () => ({
  deleteImage: vi.fn(),
}))

const { db } = await import('@/lib/db')
const { deleteImage } = await import('@/lib/storage')

function makeRequest(url: string) {
  return new NextRequest(new URL(url, 'http://localhost'))
}

describe('DELETE /api/weapons/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deletes weapon and its image', async () => {
    vi.mocked(db.weapon.findUnique).mockResolvedValue({
      id: 'test-id',
      imageUrl: '/uploads/weapons/test-id/img.png',
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'done',
      userPrompt: 'A sword',
      options: '{}',
      weaponSpec: null,
      descriptionMd: null,
      errorMessage: null,
      imagePrompt: null,
      imageModel: null,
      textModel: null,
      promptVersion: 'v1',
    })
    vi.mocked(db.weapon.delete).mockResolvedValue({} as any)

    const req = makeRequest('http://localhost/api/weapons/test-id')
    const res = await DELETE(req, { params: Promise.resolve({ id: 'test-id' }) })

    expect(res.status).toBe(200)
    expect(deleteImage).toHaveBeenCalledWith('/uploads/weapons/test-id/img.png')
    expect(db.weapon.delete).toHaveBeenCalledWith({ where: { id: 'test-id' } })
  })

  it('deletes weapon without image', async () => {
    vi.mocked(db.weapon.findUnique).mockResolvedValue({
      id: 'test-id',
      imageUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'done',
      userPrompt: 'A sword',
      options: '{}',
      weaponSpec: null,
      descriptionMd: null,
      errorMessage: null,
      imagePrompt: null,
      imageModel: null,
      textModel: null,
      promptVersion: 'v1',
    })
    vi.mocked(db.weapon.delete).mockResolvedValue({} as any)

    const req = makeRequest('http://localhost/api/weapons/test-id')
    const res = await DELETE(req, { params: Promise.resolve({ id: 'test-id' }) })

    expect(res.status).toBe(200)
    expect(deleteImage).not.toHaveBeenCalled()
    expect(db.weapon.delete).toHaveBeenCalledWith({ where: { id: 'test-id' } })
  })

  it('returns 404 for non-existent weapon', async () => {
    vi.mocked(db.weapon.findUnique).mockResolvedValue(null)

    const req = makeRequest('http://localhost/api/weapons/missing')
    const res = await DELETE(req, { params: Promise.resolve({ id: 'missing' }) })

    expect(res.status).toBe(404)
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/app/api/weapons/__tests__/delete-weapon.test.ts`
Expected: FAIL — `DELETE` is not exported from route.ts

**Step 3: Write the DELETE handler**

Add to `src/app/api/weapons/[id]/route.ts`:

```ts
import { deleteImage } from '@/lib/storage'

/**
 * DELETE /api/weapons/:id - Delete weapon and its image
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const weapon = await db.weapon.findUnique({ where: { id } })

    if (!weapon) {
      return notFound('Weapon not found')
    }

    if (weapon.imageUrl) {
      await deleteImage(weapon.imageUrl)
    }

    await db.weapon.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/weapons/:id error:', error)
    return serverError('Failed to delete weapon')
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/app/api/weapons/__tests__/delete-weapon.test.ts`
Expected: PASS (all 3 tests)

**Step 5: Commit**

```bash
git add src/app/api/weapons/[id]/route.ts src/app/api/weapons/__tests__/delete-weapon.test.ts
git commit -m "feat: add DELETE /api/weapons/:id endpoint with image cleanup"
```

---

### Task 2: Add delete button to WeaponCard (detail page)

**Files:**
- Modify: `src/components/weapon-card.tsx`
- Modify: `src/app/weapons/[id]/weapon-detail-client.tsx`

**Step 1: Add `onDelete` prop and delete button to WeaponCard**

In `src/components/weapon-card.tsx`, update the interface and component:

```ts
// Add to WeaponCardProps interface:
onDelete?: () => Promise<void>
```

Add to the destructured props: `onDelete`

Add state:
```ts
const [deleting, setDeleting] = useState(false)
```

Add handler:
```ts
async function handleDelete() {
  if (!onDelete) return
  if (!window.confirm('Delete this weapon? This cannot be undone.')) return
  setDeleting(true)
  setActionError(null)
  try {
    await onDelete()
  } catch (err) {
    setActionError(err instanceof Error ? err.message : 'Failed to delete weapon')
    setDeleting(false)
  }
}
```

Update the CardFooter condition from:
```tsx
{(onRegenerateImage || onRerollStats) && (
```
to:
```tsx
{(onRegenerateImage || onRerollStats || onDelete) && (
```

Add the delete button inside CardFooter, after the existing buttons, with a spacer to push it right:

```tsx
{onDelete && (
  <>
    <div className="flex-1" />
    <Button
      variant="ghost"
      size="sm"
      onClick={handleDelete}
      loading={deleting}
      disabled={regeneratingImage || rerollingStats}
      className="text-red-400 hover:text-red-300 hover:bg-red-900/30"
    >
      Delete
    </Button>
  </>
)}
```

**Step 2: Wire up delete in weapon-detail-client.tsx**

Add `handleDelete` function in `WeaponDetailClient`:

```ts
async function handleDelete() {
  const response = await fetch(`/api/weapons/${weapon.id}`, { method: 'DELETE' })
  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.error || 'Failed to delete weapon')
  }
  router.push('/weapons')
}
```

Pass it to `WeaponCard`:
```tsx
<WeaponCard
  weapon={weapon}
  onRegenerateImage={handleRegenerateImage}
  onRerollStats={handleRerollStats}
  onDelete={handleDelete}
/>
```

**Step 3: Commit**

```bash
git add src/components/weapon-card.tsx src/app/weapons/[id]/weapon-detail-client.tsx
git commit -m "feat: add delete button to weapon detail page"
```

---

### Task 3: Add delete button to WeaponList (gallery)

**Files:**
- Modify: `src/components/weapon-list.tsx`

**Step 1: Convert WeaponList to client component and add delete functionality**

The WeaponList needs to become a client component to handle delete interactions. Replace the full contents of `src/components/weapon-list.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Card } from './ui'
import { RARITY_COLORS } from '@/lib/schemas'
import type { WeaponSummary } from '@/lib/schemas'
import type { Rarity } from '@/lib/schemas'

interface WeaponListProps {
  weapons: WeaponSummary[]
}

export function WeaponList({ weapons }: WeaponListProps) {
  const router = useRouter()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function handleDelete(e: React.MouseEvent, weaponId: string) {
    e.preventDefault()
    e.stopPropagation()
    if (!window.confirm('Delete this weapon? This cannot be undone.')) return
    setDeletingId(weaponId)
    try {
      const response = await fetch(`/api/weapons/${weaponId}`, { method: 'DELETE' })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        alert(data.error || 'Failed to delete weapon')
        return
      }
      router.refresh()
    } finally {
      setDeletingId(null)
    }
  }

  if (weapons.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400">No weapons yet. Create your first one!</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {weapons.map((weapon) => (
        <WeaponListItem
          key={weapon.id}
          weapon={weapon}
          deleting={deletingId === weapon.id}
          onDelete={handleDelete}
        />
      ))}
    </div>
  )
}

function WeaponListItem({
  weapon,
  deleting,
  onDelete,
}: {
  weapon: WeaponSummary
  deleting: boolean
  onDelete: (e: React.MouseEvent, id: string) => void
}) {
  const isLoading = weapon.status !== 'done' && weapon.status !== 'error'
  const rarityColor = weapon.rarity ? RARITY_COLORS[weapon.rarity as Rarity] : 'text-slate-400'

  return (
    <Link href={`/weapons/${weapon.id}`}>
      <Card className={`hover:border-indigo-500 transition-colors cursor-pointer h-full group relative ${deleting ? 'opacity-50' : ''}`}>
        {/* Delete button */}
        <button
          type="button"
          onClick={(e) => onDelete(e, weapon.id)}
          disabled={deleting}
          className="absolute top-2 right-2 z-10 p-1.5 rounded-full bg-slate-900/80 text-slate-400 hover:text-red-400 hover:bg-red-900/50 opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="Delete weapon"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
          </svg>
        </button>

        {/* Image */}
        <div className="relative aspect-square bg-slate-900">
          {weapon.imageUrl ? (
            <Image
              src={weapon.imageUrl}
              alt={weapon.name ?? 'Weapon'}
              fill
              className="object-contain"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              {isLoading ? (
                <div className="text-slate-500 text-sm">Generating...</div>
              ) : weapon.status === 'error' ? (
                <div className="text-red-500 text-sm">Failed</div>
              ) : (
                <div className="text-slate-600 text-sm">No image</div>
              )}
            </div>
          )}

          {/* Status badge */}
          {isLoading && (
            <div className="absolute top-2 right-2 px-2 py-1 bg-indigo-600 text-white text-xs rounded-full">
              {weapon.status.replaceAll('_', ' ')}
            </div>
          )}
          {weapon.status === 'error' && (
            <div className="absolute top-2 right-2 px-2 py-1 bg-red-600 text-white text-xs rounded-full">
              Error
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-4">
          <h3 className="font-semibold text-white truncate">
            {weapon.name ?? 'Generating...'}
          </h3>
          {weapon.rarity && (
            <p className={`text-sm ${rarityColor} capitalize`}>
              {weapon.rarity.replaceAll('_', ' ')}
            </p>
          )}
          <p className="text-xs text-slate-500 mt-2 line-clamp-2">{weapon.userPrompt}</p>
        </div>
      </Card>
    </Link>
  )
}
```

Note: The delete button appears on hover via `group-hover:opacity-100`. The status badges conflict with the delete button position — when loading/error, the status badge occupies `top-2 right-2`. The delete button also uses `top-2 right-2` but has `z-10` so it stacks above. When a weapon is loading/errored the delete button's position will overlap the status badge, but this is acceptable since loading weapons rarely need deletion and error weapons commonly do.

**Step 2: Commit**

```bash
git add src/components/weapon-list.tsx
git commit -m "feat: add delete button to weapon gallery cards"
```

---

### Task 4: Run all tests and verify

**Step 1: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass including the new delete-weapon tests

**Step 2: Commit any fixes if needed**
