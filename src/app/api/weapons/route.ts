import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createWeaponRequestSchema, listWeaponsQuerySchema } from '@/lib/schemas'
import { runGenerationInBackground } from '@/lib/generation'
import { badRequest, handleZodError, serverError, toWeaponResponse, toWeaponSummary } from '@/lib/api'
import { WEAPON_STATUS } from '@/types'

/**
 * POST /api/weapons - Create a new weapon generation
 */
export async function POST(request: NextRequest) {
  try {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return badRequest('Invalid JSON body')
    }
    const parsed = createWeaponRequestSchema.safeParse(body)

    if (!parsed.success) {
      return handleZodError(parsed.error)
    }

    const { prompt, options } = parsed.data

    // Create weapon record
    const weapon = await db.weapon.create({
      data: {
        userPrompt: prompt,
        options: JSON.stringify(options),
        status: WEAPON_STATUS.QUEUED,
      },
    })

    // Start generation in background
    runGenerationInBackground({
      weaponId: weapon.id,
      userPrompt: prompt,
      options,
    })

    // Return immediately with queued status
    return NextResponse.json(toWeaponResponse(weapon), { status: 201 })
  } catch (error) {
    console.error('POST /api/weapons error:', error)
    return serverError('Failed to create weapon')
  }
}

/**
 * GET /api/weapons - List weapons (paginated)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const parsed = listWeaponsQuerySchema.safeParse({
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
    })

    if (!parsed.success) {
      return handleZodError(parsed.error)
    }

    const { page, limit } = parsed.data
    const skip = (page - 1) * limit

    const [weapons, total] = await Promise.all([
      db.weapon.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.weapon.count(),
    ])

    return NextResponse.json({
      weapons: weapons.map(toWeaponSummary),
      total,
      page,
      limit,
      hasMore: skip + weapons.length < total,
    })
  } catch (error) {
    console.error('GET /api/weapons error:', error)
    return serverError('Failed to list weapons')
  }
}
