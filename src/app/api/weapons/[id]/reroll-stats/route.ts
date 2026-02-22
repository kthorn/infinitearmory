import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { rerollWeapon } from '@/lib/generation'
import { errorResponse, notFound, serverError, toWeaponResponse } from '@/lib/api'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * POST /api/weapons/:id/reroll-stats - Regenerate everything for a weapon
 */
export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    // Check weapon exists and is not already generating
    const weapon = await db.weapon.findUnique({ where: { id } })
    if (!weapon) {
      return notFound('Weapon not found')
    }
    if (weapon.status === 'generating_text' || weapon.status === 'generating_image') {
      return errorResponse('Weapon is currently being generated', 409)
    }

    // Run full reroll (blocking)
    await rerollWeapon(id)

    // Return updated weapon
    const updated = await db.weapon.findUnique({ where: { id } })
    if (!updated) {
      return notFound('Weapon was deleted during reroll')
    }
    return NextResponse.json(toWeaponResponse(updated))
  } catch (error) {
    console.error('POST /api/weapons/:id/reroll-stats error:', error)
    return serverError('Failed to reroll weapon')
  }
}
