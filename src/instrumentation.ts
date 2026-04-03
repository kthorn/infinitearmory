export async function register() {
  // Importing env triggers Zod validation of all environment variables at startup
  await import('@/lib/env')

  // Node.js runtime only — recovery + idle shutdown
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { recoverStuckWeapons } = await import('@/lib/generation/recovery')
    await recoverStuckWeapons()

    const { startIdleShutdownCheck } = await import('@/lib/idle-shutdown-check')
    startIdleShutdownCheck()
  }
}
