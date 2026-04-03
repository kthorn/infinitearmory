// Node.js runtime only — uses process.exit, must NOT be imported from middleware
import { lastActivityAt } from './idle-shutdown'
import { hasInFlightOperations } from './generation/in-flight'

const GRACEFUL_WAIT_MS = 120_000 // wait up to 2 minutes for in-flight ops
const GRACEFUL_POLL_MS = 2_000

export function startIdleShutdownCheck() {
  if (process.env.NODE_ENV !== 'production') return

  const idleMinutes = parseInt(process.env.IDLE_SHUTDOWN_MINUTES || '60', 10)
  const checkIntervalMs = 60_000

  console.log(`Scale-to-zero enabled: will shut down after ${idleMinutes} minutes of inactivity`)

  const interval = setInterval(async () => {
    const idleMs = Date.now() - lastActivityAt
    const currentIdleMinutes = idleMs / 60_000

    if (currentIdleMinutes >= idleMinutes) {
      if (hasInFlightOperations()) {
        console.log('Idle shutdown deferred: waiting for in-flight generation to complete')
        await waitForInFlight()
      }

      console.log(
        `Idle for ${Math.round(currentIdleMinutes)} minutes, shutting down for scale-to-zero`
      )
      process.exit(0)
    }
  }, checkIntervalMs)

  interval.unref()
}

async function waitForInFlight(): Promise<void> {
  const deadline = Date.now() + GRACEFUL_WAIT_MS
  while (hasInFlightOperations() && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, GRACEFUL_POLL_MS))
  }
  if (hasInFlightOperations()) {
    console.warn('Graceful wait timed out — in-flight operations still running, exiting anyway')
  }
}
