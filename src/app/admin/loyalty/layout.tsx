import { redirect } from 'next/navigation'
import { requireFeature } from '@/lib/requireFeature'

/**
 * Loyalty Points add-on layout.
 * Gates the entire /admin/loyalty route tree behind the loyalty_points subscription.
 * Unauthenticated users are caught by the admin middleware before reaching here.
 */
export default async function LoyaltyLayout({ children }: { children: React.ReactNode }) {
  const result = await requireFeature('loyalty_points')

  if (!result.authorized) {
    redirect(result.upgradeUrl)
  }

  return <>{children}</>
}
