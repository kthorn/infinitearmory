export async function register() {
  // Importing env triggers Zod validation of all environment variables at startup
  await import('@/lib/env')
}
