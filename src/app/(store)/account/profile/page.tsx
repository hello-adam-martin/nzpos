import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ProfileForm } from './ProfileForm'
import { getCustomerLoyalty } from '@/actions/loyalty/getCustomerLoyalty'
import { LoyaltyBanner } from '@/components/store/LoyaltyBanner'
import { LoyaltyBalanceSection } from '@/components/store/LoyaltyBalanceSection'

export const metadata = {
  title: 'My Profile | NZPOS',
}

export default async function ProfilePage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.app_metadata?.role !== 'customer') {
    redirect('/account/signin')
  }

  // customers table is not in generated types yet (added in migration 012_customer_accounts.sql)
  // Cast to untyped client until `supabase gen types` is re-run post-migration
  const untypedSupabase = supabase as unknown as SupabaseClient
  const { data: customer } = await untypedSupabase
    .from('customers')
    .select('*')
    .eq('auth_user_id', user.id)
    .single() as { data: { name?: string | null; preferences?: { email_receipts?: boolean; marketing_emails?: boolean } | null } | null }

  const initialData = {
    name: customer?.name ?? '',
    email: user.email ?? '',
    emailReceiptsEnabled: customer?.preferences?.email_receipts ?? true,
    marketingEmailsEnabled: customer?.preferences?.marketing_emails ?? false,
  }

  // Fetch loyalty data (non-blocking — errors result in loyalty section being hidden)
  const loyaltyResult = await getCustomerLoyalty()
  const loyalty = 'data' in loyaltyResult ? loyaltyResult.data : null

  return (
    <div className="py-8">
      <div className="max-w-[600px] mx-auto px-4">
        {/* Privacy banner (D-11, LOYAL-11) — shown on first visit when loyalty is active */}
        {loyalty && (
          <LoyaltyBanner
            isActive={loyalty.isActive}
            bannerDismissed={loyalty.bannerDismissed}
          />
        )}
      </div>

      <ProfileForm initialData={initialData} />

      {/* Loyalty balance section — shown when loyalty is active */}
      {loyalty && loyalty.isActive && (
        <div className="max-w-[600px] mx-auto mt-6 px-4">
          <LoyaltyBalanceSection
            pointsBalance={loyalty.pointsBalance}
            redeemRateCents={loyalty.redeemRateCents}
            dollarValue={loyalty.dollarValue}
            transactions={loyalty.transactions}
          />
        </div>
      )}
    </div>
  )
}
