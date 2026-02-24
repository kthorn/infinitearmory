import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { rerollWeapon } from '@/lib/generation'
import { badRequest, errorResponse, notFound, serverError, handleZodError, toWeaponResponse } from '@/lib/api'

interface RouteParams {
  params: Promise<{ id: string }>
}

const requestSchema = z.object({
  guidance: z.optional(z.string().min(1).max(1000)),
})

/**
 * POST /api/weapons/:id/reroll-stats - Regenerate everything for a weapon
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    // Parse optional body
    let guidance: string | undefined
    const text = await request.text()
    if (text.trim()) {
      let body: unknown
      try {
        body = JSON.parse(text)
      } catch {
        return badRequest('Invalid JSON body')
      }
      const parsed = requestSchema.safeParse(body)
      if (!parsed.success) {
        return handleZodError(parsed.error)
      }
      guidance = parsed.data.guidance?.trim() || undefined
    }

    // Check weapon exists and is not already generating
    const weapon = await db.weapon.findUnique({ where: { id } })
    if (!weapon) {
      return notFound('Weapon not found')
    }
    if (weapon.status === 'generating_text' || weapon.status === 'generating_image') {
      return errorResponse('Weapon is currently being generated', 409)
    }
    if (guidance && !weapon.weaponSpec) {
      return badRequest('Cannot refine a weapon that has no stats yet')
    }

    await rerollWeapon(id, guidance)

    // Return updated weapon
    const updated = await db.weapon.findUnique({
      where: { id },
      include: { _count: { select: { versions: true } } },
    })
    if (!updated) {
      return notFound('Weapon was deleted during reroll')
    }
    return NextResponse.json(toWeaponResponse(updated))
  } catch (error) {
    console.error('POST /api/weapons/:id/reroll-stats error:', error)
    return serverError('Failed to reroll weapon')
  }
}
