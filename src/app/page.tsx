import { Suspense } from 'react'
import Link from 'next/link'
import { WeaponForm } from '@/components'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">Fantasy Weapon Generator</h1>
          <p className="text-slate-300 max-w-2xl mx-auto">
            Create unique magical weapons with AI-generated descriptions, balanced stats, and
            stunning artwork. Perfect for D&D, Pathfinder, or any fantasy RPG.
          </p>
        </div>

        <Suspense>
          <WeaponForm />
        </Suspense>

        <div className="text-center mt-8">
          <Link
            href="/weapons"
            className="text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            View weapon history →
          </Link>
        </div>
      </div>
    </main>
  )
}
