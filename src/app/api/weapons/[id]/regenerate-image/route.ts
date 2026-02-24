import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { regenerateImage } from '@/lib/generation'
import { badRequest, errorResponse, notFound, serverError, handleZodError, toWeaponResponse } from '@/lib/api'
import { styleSchema } from '@/lib/schemas'

interface RouteParams {
  params: Promise<{ id: string }>
}

const requestSchema = z.object({
  style: z.optional(styleSchema),
  guidance: z.optional(z.string().min(1).max(1000)),
})

/**
 * POST /api/weapons/:id/regenerate-image - Generate new image for existing weapon
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    // Parse optional body
    let style: string | undefined
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
      style = parsed.data.style
      guidance = parsed.data.guidance?.trim() || undefined
    }

    // Check weapon exists, has spec, and is not already generating
    const weapon = await db.weapon.findUnique({ where: { id } })
    if (!weapon) {
      return notFound('Weapon not found')
    }
    if (!weapon.weaponSpec) {
      return badRequest('Weapon has no spec to regenerate image from')
    }
    if (weapon.status === 'generating_text' || weapon.status === 'generating_image') {
      return errorResponse('Weapon is currently being generated', 409)
    }

    // Run regeneration (blocking for this endpoint)
    await regenerateImage(id, style, guidance)

    // Return updated weapon
    const updated = await db.weapon.findUnique({
      where: { id },
      include: { _count: { select: { versions: true } } },
    })
    if (!updated) {
      return notFound('Weapon was deleted during regeneration')
    }
    return NextResponse.json(toWeaponResponse(updated))
  } catch (error) {
    console.error('POST /api/weapons/:id/regenerate-image error:', error)
    return serverError('Failed to regenerate image')
  }
}
