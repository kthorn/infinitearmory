import Link from 'next/link'
import { db } from '@/lib/db'
import { WeaponList } from '@/components'
import { toWeaponSummary } from '@/lib/api'

export const dynamic = 'force-dynamic'

export default async function WeaponsPage() {
  const weapons = await db.weapon.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      <div className="container mx-auto px-4 py-16">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white">Weapon History</h1>
          <Link
            href="/"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
          >
            Create New
          </Link>
        </div>

        <WeaponList weapons={weapons.map(toWeaponSummary)} />
      </div>
    </main>
  )
}
