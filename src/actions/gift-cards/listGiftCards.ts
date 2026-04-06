'use server'
import 'server-only'
import { z } from 'zod'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveStaffAuth } from '@/lib/resolveAuth'
import { effectiveGiftCardStatus } from '@/lib/gift-card-utils'

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const ListGiftCardsSchema = z.object({
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(20),
  status: z.enum(['all', 'active', 'redeemed', 'expired', 'voided']).default('all'),
  search: z.string().optional(),
  sortBy: z.enum(['issued_at', 'expires_at', 'balance_cents', 'original_value_cents']).default('issued_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

export type GiftCardListRow = {
  id: string
  codeLast4: string
  original_value_cents: number
  balance_cents: number
  status: 'active' | 'redeemed' | 'expired' | 'voided'
  issued_at: string
  expires_at: string
}

export type ListGiftCardsResult =
  | { success: true; data: GiftCardListRow[]; total: number; page: number; pageSize: number }
  | { success: false; error: string }

// ---------------------------------------------------------------------------
// Server Action
// ---------------------------------------------------------------------------

/**
 * Lists gift cards for the authenticated store with pagination, filtering, and sorting.
 *
 * - Returns only last 4 digits of code for display (security — never expose full code in list)
 * - Computes effective status for active cards past expiry (Pitfall 2)
 * - Staff auth required
 */
export async function listGiftCards(input: unknown): Promise<ListGiftCardsResult> {
  const staff = await resolveStaffAuth()
  if (!staff) return { success: false, error: 'Not authenticated' }

  const parsed = ListGiftCardsSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: 'Invalid input' }
  }

  const { page, pageSize, status, search, sortBy, sortOrder } = parsed.data
  const storeId = staff.store_id
  const supabase = createSupabaseAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('gift_cards')
    .select('id, code, original_value_cents, balance_cents, status, issued_at, expires_at', { count: 'exact' })
    .eq('store_id', storeId)

  // Status filter — when filtering for 'active', also exclude expired-by-date
  // For server-side filtering, we filter by DB status and post-filter for effective expiry
  if (status !== 'all') {
    if (status === 'active') {
      // Active AND not past expiry
      query = query
        .eq('status', 'active')
        .gte('expires_at', new Date().toISOString())
    } else if (status === 'expired') {
      // Either DB-expired or active past expiry date
      query = query.or(`status.eq.expired,and(status.eq.active,expires_at.lt.${new Date().toISOString()})`)
    } else {
      query = query.eq('status', status)
    }
  }

  // Search by last 4 digits of code
  if (search && search.trim()) {
    const digits = search.replace(/\D/g, '')
    if (digits) {
      query = query.like('code', `%${digits}`)
    }
  }

  // Sorting
  query = query.order(sortBy, { ascending: sortOrder === 'asc' })

  // Pagination
  const from = (page - 1) * pageSize
  const to = page * pageSize - 1
  query = query.range(from, to)

  const { data: rows, count, error } = await query

  if (error) {
    console.error('[listGiftCards] store_id=%s error:', storeId, error)
    return { success: false, error: 'Failed to fetch gift cards' }
  }

  const data: GiftCardListRow[] = (rows ?? []).map((row: {
    id: string
    code: string
    original_value_cents: number
    balance_cents: number
    status: 'active' | 'redeemed' | 'expired' | 'voided'
    issued_at: string
    expires_at: string
  }) => ({
    id: row.id,
    codeLast4: row.code.slice(-4),
    original_value_cents: row.original_value_cents,
    balance_cents: row.balance_cents,
    // Compute effective status — active past expiry shown as expired
    status: effectiveGiftCardStatus(row.status, row.expires_at),
    issued_at: row.issued_at,
    expires_at: row.expires_at,
  }))

  return {
    success: true,
    data,
    total: count ?? 0,
    page,
    pageSize,
  }
}
