export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 text-white">
      <div className="container mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold text-center mb-4">Fantasy Weapon Generator</h1>
        <p className="text-center text-slate-300 mb-8">
          Create unique magical weapons with AI-generated descriptions, stats, and artwork.
        </p>
        <div className="max-w-md mx-auto bg-slate-800 rounded-lg p-6 border border-slate-700">
          <p className="text-slate-400 text-center">Weapon generation form coming soon...</p>
        </div>
      </div>
    </main>
  )
}
