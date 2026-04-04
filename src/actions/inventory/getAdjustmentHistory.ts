'use server'
import 'server-only'
import { resolveAuth } from '@/lib/resolveAuth'
import { createSupabaseServerClient } from '@/lib/supabase/server'

interface HistoryFilters {
  productId?: string
  fromDate?: string // ISO date string
  toDate?: string // ISO date string
  reason?: string
  page?: number // 1-based, default 1
}

const PAGE_SIZE = 50

/**
 * Server action to retrieve paginated stock adjustment history for a store.
 *
 * Supports filtering by product, date range, and reason code.
 * Returns rows ordered by created_at descending (most recent first).
 * Joins product name and SKU via FK for display.
 *
 * @param filters - Optional filter and pagination params
 * @returns { success: true, rows, total, page, pageSize } on success
 *          { error: 'not_authenticated' } if no auth session
 *          { error: 'server_error' } on DB error
 */
export async function getAdjustmentHistory(filters: HistoryFilters = {}) {
  const staff = await resolveAuth()
  if (!staff) return { error: 'not_authenticated' as const }

  const supabase = await createSupabaseServerClient()
  const page = filters.page ?? 1
  const offset = (page - 1) * PAGE_SIZE

  let query = supabase
    .from('stock_adjustments')
    .select('*, products(name, sku)', { count: 'exact' })
    .eq('store_id', staff.store_id)
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  if (filters.productId) query = query.eq('product_id', filters.productId)
  if (filters.fromDate) query = query.gte('created_at', filters.fromDate)
  if (filters.toDate) query = query.lte('created_at', filters.toDate)
  if (filters.reason) query = query.eq('reason', filters.reason)

  const { data, error, count } = await query
  if (error) {
    console.error('[getAdjustmentHistory] DB error:', error)
    return { error: 'server_error' as const }
  }

  return {
    success: true as const,
    rows: data ?? [],
    total: count ?? 0,
    page,
    pageSize: PAGE_SIZE,
  }
}
