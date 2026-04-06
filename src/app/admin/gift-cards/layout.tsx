import { redirect } from 'next/navigation'
import { requireFeature } from '@/lib/requireFeature'

/**
 * Gift Cards add-on layout.
 * Gates the entire /admin/gift-cards route tree behind the gift_cards subscription.
 * Unauthenticated users are caught by the admin middleware before reaching here.
 */
export default async function GiftCardsLayout({ children }: { children: React.ReactNode }) {
  const result = await requireFeature('gift_cards')

  if (!result.authorized) {
    redirect(result.upgradeUrl)
  }

  return <>{children}</>
}
