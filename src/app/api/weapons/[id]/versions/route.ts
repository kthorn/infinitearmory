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
