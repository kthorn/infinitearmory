import { generateWeapon, type GenerateWeaponParams } from './orchestrator'

/**
 * Run weapon generation in the background (fire-and-forget)
 *
 * This is used after returning the API response to the client.
 * Errors are caught and logged, not propagated.
 */
export function runGenerationInBackground(params: GenerateWeaponParams): void {
  // Use setImmediate to run after current event loop
  setImmediate(async () => {
    try {
      await generateWeapon(params)
      console.log(`Generation completed: ${params.weaponId}`)
    } catch (error) {
      // Error is already persisted to DB in orchestrator
      console.error(`Generation failed: ${params.weaponId}`, error)
    }
  })
}
