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
