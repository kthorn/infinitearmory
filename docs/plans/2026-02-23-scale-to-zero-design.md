# Scale-to-Zero Design

## Summary

Implement idle shutdown so the Fly.io machine stops after 1 hour of inactivity, eliminating costs when the app isn't in use. On the next request, Fly's proxy auto-starts the machine.

## Approach

Based on the [fly-apps/autoscale-to-zero-demo](https://github.com/fly-apps/autoscale-to-zero-demo) pattern: the app self-terminates via `process.exit(0)` after a configurable idle period. No Fly API calls needed.

**Key detail:** `auto_stop_machines` stays `false` to prevent Fly from stopping the machine before our timer expires. Only `min_machines_running` changes to `0`.

## Changes

### 1. New file: `src/lib/idle-shutdown.ts`

- Exports `resetIdleTimer()` which resets the inactivity countdown
- Runs a check interval (every 60s) comparing `Date.now()` against last activity
- After `IDLE_SHUTDOWN_MINUTES` (default 60) of no requests, calls `process.exit(0)`
- Only active when `NODE_ENV=production`
- Logs shutdown to console for observability

### 2. Update `src/middleware.ts`

- Import and call `resetIdleTimer()` on every request

### 3. Update `fly.toml`

- `min_machines_running = 0` (from 1) — allows zero running machines
- `auto_stop_machines = false` (unchanged) — app controls its own shutdown
- `auto_start_machines = true` (unchanged) — Fly restarts on next request

### 4. Update `.env.example`

- Document `IDLE_SHUTDOWN_MINUTES` env var
