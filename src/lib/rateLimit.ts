/**
 * In-memory rate limiter for promo code validation (DISC-02).
 * Tracks attempts per IP with 1-minute sliding window.
 * Per-instance only (Vercel serverless) — acceptable for v1 traffic.
 */
const attempts = new Map<string, { count: number; resetAt: number }>()

export function checkRateLimit(ip: string, maxPerMinute: number): boolean {
  const now = Date.now()
  const entry = attempts.get(ip)

  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + 60_000 })
    return true
  }

  if (entry.count >= maxPerMinute) return false

  entry.count++
  return true
}
