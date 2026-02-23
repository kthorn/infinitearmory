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
