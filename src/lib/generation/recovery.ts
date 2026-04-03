import { db } from '@/lib/db'
import { WEAPON_STATUS } from '@/types'

const STALE_THRESHOLD_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Recover weapons stuck in generating states after a process restart.
 *
 * - Refinements (have imageUrl) are reset to 'done' since their previous data is intact
 * - Fresh creations (no imageUrl) are set to 'error'
 */
export async function recoverStuckWeapons(): Promise<void> {
  const cutoff = new Date(Date.now() - STALE_THRESHOLD_MS)

  const stuck = await db.weapon.findMany({
    where: {
      status: { in: [WEAPON_STATUS.GENERATING_TEXT, WEAPON_STATUS.GENERATING_IMAGE] },
      updatedAt: { lt: cutoff },
    },
    select: { id: true, status: true, imageUrl: true, weaponSpec: true },
  })

  if (stuck.length === 0) return

  for (const weapon of stuck) {
    const isRefinement = weapon.imageUrl !== null && weapon.weaponSpec !== null
    const newStatus = isRefinement ? WEAPON_STATUS.DONE : WEAPON_STATUS.ERROR

    await db.weapon.update({
      where: { id: weapon.id },
      data: {
        status: newStatus,
        errorMessage: isRefinement ? null : 'Generation interrupted by server restart',
      },
    })

    console.log(
      `Recovered stuck weapon ${weapon.id}: ${weapon.status} → ${newStatus}` +
        (isRefinement ? ' (refinement, restored previous state)' : ' (fresh creation, marked error)')
    )
  }

  console.log(`Recovered ${stuck.length} stuck weapon(s)`)
}
