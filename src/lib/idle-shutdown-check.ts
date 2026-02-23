// Node.js runtime only — uses process.exit, must NOT be imported from middleware
import { lastActivityAt } from './idle-shutdown'

export function startIdleShutdownCheck() {
  if (process.env.NODE_ENV !== 'production') return

  const idleMinutes = parseInt(process.env.IDLE_SHUTDOWN_MINUTES || '60', 10)
  const checkIntervalMs = 60_000

  console.log(`Scale-to-zero enabled: will shut down after ${idleMinutes} minutes of inactivity`)

  const interval = setInterval(() => {
    const idleMs = Date.now() - lastActivityAt
    const currentIdleMinutes = idleMs / 60_000

    if (currentIdleMinutes >= idleMinutes) {
      console.log(
        `Idle for ${Math.round(currentIdleMinutes)} minutes, shutting down for scale-to-zero`
      )
      process.exit(0)
    }
  }, checkIntervalMs)

  interval.unref()
}
