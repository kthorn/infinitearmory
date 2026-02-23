import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { notFound, serverError, toWeaponResponse } from '@/lib/api'
import { deleteImage } from '@/lib/storage'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/weapons/:id - Get weapon by ID
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const weapon = await db.weapon.findUnique({
      where: { id },
      include: { _count: { select: { versions: true } } },
    })

    if (!weapon) {
      return notFound('Weapon not found')
    }

    return NextResponse.json(toWeaponResponse(weapon))
  } catch (error) {
    console.error('GET /api/weapons/:id error:', error)
    return serverError('Failed to get weapon')
  }
}

/**
 * DELETE /api/weapons/:id - Delete weapon and its image
 */
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
