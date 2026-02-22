import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { notFound, serverError, toWeaponResponse } from '@/lib/api'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/weapons/:id - Get weapon by ID
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const weapon = await db.weapon.findUnique({ where: { id } })

    if (!weapon) {
      return notFound('Weapon not found')
    }

    return NextResponse.json(toWeaponResponse(weapon))
  } catch (error) {
    console.error('GET /api/weapons/:id error:', error)
    return serverError('Failed to get weapon')
  }
}
