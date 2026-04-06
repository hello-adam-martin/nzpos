import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { requireFeature } from '@/lib/requireFeature'
import { DenominationManager } from '@/components/admin/settings/DenominationManager'

export const dynamic = 'force-dynamic'

/**
 * /admin/settings/gift-cards — Denomination management for the Gift Cards add-on.
 * Allows merchants to configure which gift card values customers can purchase.
 * Gated behind gift_cards subscription feature.
 */
export default async function GiftCardSettingsPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  const storeId = user?.app_metadata?.store_id as string | undefined
  if (!storeId) {
    redirect('/login')
  }

  // Feature gate — must have gift_cards subscription
  const featureResult = await requireFeature('gift_cards')
  if (!featureResult.authorized) {
    redirect(featureResult.upgradeUrl)
  }

  // Fetch current denominations from store record
  const { data: store } = await supabase
    .from('stores')
    .select('gift_card_denominations')
    .eq('id', storeId)
    .single()

  // Default denominations: $25, $50, $100 (matching migration default)
  const rawDenominations = store?.gift_card_denominations
  const denominations: number[] = Array.isArray(rawDenominations)
    ? rawDenominations.filter((d): d is number => typeof d === 'number')
    : [2500, 5000, 10000]

  return (
    <div className="space-y-[var(--space-xl)]">
      <div>
        <h1 className="font-display font-bold text-2xl text-[var(--color-text)]">
          Gift Card Settings
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)] font-sans">
          Configure the denominations available for gift card purchases in-store and online.
        </p>
      </div>

      <section className="bg-card border border-[var(--color-border)] rounded-[var(--radius-lg)] p-6 space-y-4">
        <div>
          <h2 className="text-base font-semibold font-sans text-[var(--color-text)]">
            Denominations
          </h2>
          <p className="mt-1 text-sm text-[var(--color-text-muted)] font-sans">
            Set the fixed dollar amounts customers can choose when purchasing a gift card.
            Minimum $5, maximum $500.
          </p>
        </div>

        <DenominationManager
          denominations={denominations}
          storeId={storeId}
        />
      </section>
    </div>
  )
}
