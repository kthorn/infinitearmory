/**
 * Tracks in-flight generation operations so the idle shutdown
 * can wait for them to complete before exiting.
 */
let inFlightCount = 0

export function incrementInFlight(): void {
  inFlightCount++
}

export function decrementInFlight(): void {
  inFlightCount = Math.max(0, inFlightCount - 1)
}

export function hasInFlightOperations(): boolean {
  return inFlightCount > 0
}
