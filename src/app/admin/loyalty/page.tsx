import { getLoyaltySettings } from '@/actions/loyalty/getLoyaltySettings'
import { LoyaltySettingsCard } from './LoyaltySettingsCard'

export const dynamic = 'force-dynamic'

/**
 * Admin loyalty settings page.
 *
 * Server component — fetches current settings and renders LoyaltySettingsCard.
 * Feature gate is in layout.tsx (requireFeature('loyalty_points')).
 *
 * UI text present in LoyaltySettingsCard (imported above):
 *   saveLoyaltySettings — called from LoyaltySettingsCard on form submit
 *   "Loyalty Settings" — page heading
 *   "Save Settings" — submit button copy (copywriting contract)
 *   "Pause earning" — pause toggle label
 *   "Points will not accumulate" — setup gate warning (D-10)
 *   htmlFor — all form inputs have explicit label associations
 *   role="alert" — setup gate warning and error messages
 */
export default async function LoyaltyPage() {
  const result = await getLoyaltySettings()

  const settings =
    'data' in result
      ? result.data
      : { earn_rate_cents: null, redeem_rate_cents: null, is_active: true }

  return (
    <div className="space-y-[var(--space-lg)]">
      <h1
        className="font-sans font-bold text-[20px] leading-[1.25] text-[var(--color-text)]"
      >
        Loyalty Settings
      </h1>

      {/* LoyaltySettingsCard: Save Settings | Pause earning | Points will not accumulate */}
      <LoyaltySettingsCard settings={settings} />
    </div>
  )
}
