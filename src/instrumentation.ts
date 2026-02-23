export async function register() {
  // Importing env triggers Zod validation of all environment variables at startup
  await import('@/lib/env')

  // Start idle shutdown timer for scale-to-zero on Fly.io (Node.js runtime only)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startIdleShutdownCheck } = await import('@/lib/idle-shutdown-check')
    startIdleShutdownCheck()
  }
}
