import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveStaffAuth } from '@/lib/resolveAuth'
import { redirect } from 'next/navigation'
import { GiftCardDataTable } from '@/components/admin/gift-cards/GiftCardDataTable'
import { effectiveGiftCardStatus } from '@/lib/gift-card-utils'
import type { GiftCardListRow } from '@/actions/gift-cards/listGiftCards'

const PAGE_SIZE = 20

/**
 * Admin gift cards list page.
 *
 * Server component — fetches initial page of gift cards and renders the table.
 * Auth gate is in layout.tsx (requireFeature('gift_cards')).
 */
export default async function GiftCardsPage() {
  const staff = await resolveStaffAuth()
  if (!staff) redirect('/admin/login')

  const storeId = staff.store_id
  const supabase = createSupabaseAdminClient()

  // Fetch initial page — most recently issued first
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows, count } = await (supabase as any)
    .from('gift_cards')
    .select('id, code, original_value_cents, balance_cents, status, issued_at, expires_at', { count: 'exact' })
    .eq('store_id', storeId)
    .order('issued_at', { ascending: false })
    .range(0, PAGE_SIZE - 1)

  const initialData: GiftCardListRow[] = (rows ?? []).map((row: {
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
    status: effectiveGiftCardStatus(row.status, row.expires_at),
    issued_at: row.issued_at,
    expires_at: row.expires_at,
  }))

  const role = (staff.role === 'owner' ? 'owner' : staff.role === 'manager' ? 'manager' : 'staff') as 'owner' | 'manager' | 'staff'

  return (
    <div className="space-y-[var(--space-lg)]">
      <h1 className="text-[20px] font-semibold font-sans text-text">Gift Cards</h1>
      <GiftCardDataTable
        initialData={initialData}
        initialTotal={count ?? 0}
        role={role}
      />
    </div>
  )
}
