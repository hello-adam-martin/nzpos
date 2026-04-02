/**
 * In-memory TTL cache for slug-to-store_id lookups.
 * Used by middleware to avoid DB queries on every request.
 *
 * On Vercel serverless: cache lives per-instance. Cold starts hit DB;
 * warm instances benefit from cache. This is acceptable — slug lookup
 * is a single indexed query on a UNIQUE column.
 */
const cache = new Map<string, { store_id: string; expires: number }>()
const TTL_MS = 5 * 60 * 1000 // 5 minutes per D-02

export function getCachedStoreId(slug: string): string | null {
  const entry = cache.get(slug)
  if (!entry) return null
  if (Date.now() > entry.expires) {
    cache.delete(slug)
    return null
  }
  return entry.store_id
}

export function setCachedStoreId(slug: string, store_id: string): void {
  cache.set(slug, { store_id, expires: Date.now() + TTL_MS })
}
