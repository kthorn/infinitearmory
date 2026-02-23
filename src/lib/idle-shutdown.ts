// Edge Runtime compatible — safe to import from middleware
// Mutable timestamp updated on every request
export let lastActivityAt = Date.now()

export function resetIdleTimer() {
  lastActivityAt = Date.now()
}
