export async function register() {
  // Importing env triggers Zod validation of all environment variables at startup
  await import('@/lib/env')

  // Start idle shutdown timer for scale-to-zero on Fly.io
  const { startIdleShutdownCheck } = await import('@/lib/idle-shutdown-check')
  startIdleShutdownCheck()
}
