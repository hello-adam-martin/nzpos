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

/**
 * Retrieves a cached store_id for a given slug, returning null if not found or expired (5min TTL).
 *
 * @param slug - Store subdomain slug (e.g. 'my-store')
 * @returns Cached store_id string, or null if cache miss or entry expired
 */
export function getCachedStoreId(slug: string): string | null {
  const entry = cache.get(slug)
  if (!entry) return null
  if (Date.now() > entry.expires) {
    cache.delete(slug)
    return null
  }
  return entry.store_id
}

/**
 * Caches a slug-to-store_id mapping with 5-minute TTL.
 *
 * @param slug - Store subdomain slug (e.g. 'my-store')
 * @param store_id - UUID of the store to cache for this slug
 */
export function setCachedStoreId(slug: string, store_id: string): void {
  cache.set(slug, { store_id, expires: Date.now() + TTL_MS })
}

/**
 * Removes a slug from the tenant cache, forcing the next request to re-query the database.
 *
 * @param slug - Store subdomain slug to evict from cache
 */
export function invalidateCachedStoreId(slug: string): void {
  cache.delete(slug)
}
