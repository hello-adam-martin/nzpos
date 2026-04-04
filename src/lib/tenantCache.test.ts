import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getCachedStoreId, setCachedStoreId, invalidateCachedStoreId } from './tenantCache'

const TTL_MS = 5 * 60 * 1000 // 5 minutes

describe('tenantCache', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // Clear any existing cache entries for isolation
    invalidateCachedStoreId('test-slug')
    invalidateCachedStoreId('other-slug')
    invalidateCachedStoreId('ttl-slug')
    invalidateCachedStoreId('before-ttl-slug')
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns null for an unknown slug', () => {
    const result = getCachedStoreId('unknown-slug')
    expect(result).toBeNull()
  })

  it('returns the correct store_id after setCachedStoreId', () => {
    setCachedStoreId('test-slug', 'store-uuid-123')
    const result = getCachedStoreId('test-slug')
    expect(result).toBe('store-uuid-123')
  })

  it('returns null after invalidateCachedStoreId is called', () => {
    setCachedStoreId('test-slug', 'store-uuid-123')
    invalidateCachedStoreId('test-slug')
    const result = getCachedStoreId('test-slug')
    expect(result).toBeNull()
  })

  it('returns null when TTL has expired (after 5 minutes + 1ms)', () => {
    setCachedStoreId('ttl-slug', 'store-expired')
    vi.advanceTimersByTime(TTL_MS + 1)
    const result = getCachedStoreId('ttl-slug')
    expect(result).toBeNull()
  })

  it('returns store_id when just before TTL expiry (5 minutes - 1ms)', () => {
    setCachedStoreId('before-ttl-slug', 'store-still-valid')
    vi.advanceTimersByTime(TTL_MS - 1)
    const result = getCachedStoreId('before-ttl-slug')
    expect(result).toBe('store-still-valid')
  })

  it('does not affect other slugs when invalidating one', () => {
    setCachedStoreId('test-slug', 'store-a')
    setCachedStoreId('other-slug', 'store-b')
    invalidateCachedStoreId('test-slug')
    expect(getCachedStoreId('test-slug')).toBeNull()
    expect(getCachedStoreId('other-slug')).toBe('store-b')
  })

  it('overwrites existing cache entry on re-set', () => {
    setCachedStoreId('test-slug', 'store-old')
    setCachedStoreId('test-slug', 'store-new')
    expect(getCachedStoreId('test-slug')).toBe('store-new')
  })
})
