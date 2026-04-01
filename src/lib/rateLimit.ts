/**
 * In-memory rate limiter for server actions.
 * Tracks request counts per IP per minute window.
 * Resets per-IP counter when the minute window expires.
 *
 * Note: This is a per-process in-memory store.
 * Suitable for single-instance deployments and Vercel serverless (each
 * lambda instance has its own memory — limits are per-replica, not global).
 * For multi-replica rate limiting, use an external store (Redis / Upstash).
 */

interface RateLimitEntry {
  count: number
  windowStart: number
}

const store = new Map<string, RateLimitEntry>()

/**
 * Check whether `ip` has exceeded `maxPerMinute` requests in the current
 * 60-second sliding window.
 *
 * @returns `true`  — request is allowed (under limit)
 * @returns `false` — request is blocked (limit exceeded)
 */
export function checkRateLimit(ip: string, maxPerMinute: number): boolean {
  const now = Date.now()
  const windowMs = 60_000

  const entry = store.get(ip)

  if (!entry || now - entry.windowStart >= windowMs) {
    // New window — reset counter
    store.set(ip, { count: 1, windowStart: now })
    return true
  }

  if (entry.count >= maxPerMinute) {
    return false
  }

  entry.count += 1
  return true
}
