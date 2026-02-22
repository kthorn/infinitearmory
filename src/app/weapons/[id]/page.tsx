import { notFound } from 'next/navigation'
import Link from 'next/link'
import { db } from '@/lib/db'
import { toWeaponResponse } from '@/lib/api'
import { WeaponDetailClient } from './weapon-detail-client'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function WeaponDetailPage({ params }: PageProps) {
  const { id } = await params
  const weapon = await db.weapon.findUnique({ where: { id } })

  if (!weapon) {
    notFound()
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      <div className="container mx-auto px-4 py-16">
        <div className="mb-8">
          <Link
            href="/weapons"
            className="text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            ← Back to history
          </Link>
        </div>

        <WeaponDetailClient initialWeapon={toWeaponResponse(weapon)} />
      </div>
    </main>
  )
}
