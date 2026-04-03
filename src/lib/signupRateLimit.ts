/**
 * In-memory IP-based rate limiter for the signup Server Action.
 * Per D-12: max 5 signup attempts per IP per hour.
 *
 * On Vercel serverless: state lives per-instance. Adequate for v2.0 scale.
 * No Redis needed at this stage — revisit if deployments scale horizontally.
 */

interface RateLimitEntry {
  count: number
  windowStart: number
}

const store = new Map<string, RateLimitEntry>()

export const WINDOW_MS = 60 * 60 * 1000 // 1 hour
export const MAX_ATTEMPTS = 5

/**
 * Check whether a request from the given IP should be allowed.
 * Mutates the in-memory store: resets expired windows, increments counters.
 *
 * @param ip - The client IP address (e.g. from headers)
 * @returns { allowed: boolean; remaining: number }
 */
export function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const entry = store.get(ip)

  if (!entry || now - entry.windowStart >= WINDOW_MS) {
    // No record or window expired — start a fresh window
    store.set(ip, { count: 1, windowStart: now })
    return { allowed: true, remaining: MAX_ATTEMPTS - 1 }
  }

  if (entry.count >= MAX_ATTEMPTS) {
    return { allowed: false, remaining: 0 }
  }

  entry.count += 1
  return { allowed: true, remaining: MAX_ATTEMPTS - entry.count }
}

/**
 * Reset rate limit state for a given IP.
 * Exposed for testing purposes only.
 */
export function resetRateLimit(ip: string): void {
  store.delete(ip)
}
