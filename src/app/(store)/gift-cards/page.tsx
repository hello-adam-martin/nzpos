// Server Component — no 'use client'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { GiftCardPurchaseForm } from '@/components/store/GiftCardPurchaseForm'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ success?: string }>
}

/**
 * Storefront gift cards purchase page (D-09, D-10).
 *
 * - Reads storeId from x-store-id header (middleware-injected for tenant routing)
 * - Checks store_plans.has_gift_cards — shows 404 if not enabled
 * - Fetches gift_card_denominations from stores table
 * - Renders GiftCardPurchaseForm client component
 */
export default async function GiftCardsPage({ searchParams }: PageProps) {
  const headersList = await headers()
  const storeId = headersList.get('x-store-id')

  if (!storeId) {
    notFound()
  }

  const supabase = createSupabaseAdminClient()

  // Check feature gate: has_gift_cards must be true
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: storePlan } = await (supabase as any)
    .from('store_plans')
    .select('has_gift_cards')
    .eq('store_id', storeId)
    .single() as { data: { has_gift_cards: boolean } | null }

  if (!storePlan?.has_gift_cards) {
    notFound()
  }

  // Fetch store denominations
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: store } = await (supabase as any)
    .from('stores')
    .select('gift_card_denominations')
    .eq('id', storeId)
    .single() as { data: { gift_card_denominations: number[] | null } | null }

  const denominations: number[] = store?.gift_card_denominations ?? []

  const { success } = await searchParams
  const purchaseSuccess = success === 'true'

  return (
    <div className="py-8 sm:py-12">
      <GiftCardPurchaseForm
        storeId={storeId}
        denominations={denominations}
        purchaseSuccess={purchaseSuccess}
      />
    </div>
  )
}
