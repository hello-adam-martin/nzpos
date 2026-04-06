import { getCustomers } from '@/actions/customers/getCustomers'
import CustomersPageClient from '@/components/admin/customers/CustomersPageClient'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export default async function CustomersPage() {
  const result = await getCustomers()

  if ('error' in result) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-[var(--color-text)]">Customers</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">Manage your customer accounts.</p>
        </div>
        <p className="text-sm text-[var(--color-error)]">
          Couldn&apos;t load customers. Refresh the page to try again.
        </p>
      </div>
    )
  }

  // Query store_plans to determine loyalty feature flag for the Points column
  let hasLoyaltyPoints = false
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    const storeId = user?.app_metadata?.store_id as string | undefined
    if (storeId) {
      const adminClient = createSupabaseAdminClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: storePlan } = await (adminClient as any)
        .from('store_plans')
        .select('has_loyalty_points')
        .eq('store_id', storeId)
        .maybeSingle()
      hasLoyaltyPoints = storePlan?.has_loyalty_points === true
    }
  } catch {
    // Non-fatal — Points column simply stays hidden
  }

  return <CustomersPageClient customers={result.data} hasLoyaltyPoints={hasLoyaltyPoints} />
}
