import AdminSidebar from '@/components/admin/AdminSidebar'
import XeroDisconnectBanner from '@/components/admin/integrations/XeroDisconnectBanner'
import StripeTestModeBanner from '@/components/StripeTestModeBanner'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'

const staffSecret = new TextEncoder().encode(process.env.STAFF_JWT_SECRET!)

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  let userEmail: string | null = null
  let hasInventory = false
  let hasGiftCards = false
  let role: 'owner' | 'manager' = 'owner'
  let staffName: string | null = null
  let storeId: string | undefined

  if (user) {
    // Owner path — existing logic preserved
    userEmail = user.email ?? null
    storeId = user.app_metadata?.store_id as string | undefined
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    hasInventory = !!(user.app_metadata as any)?.inventory
    role = 'owner'
  } else {
    // Manager path — check staff_session cookie for manager JWT
    const cookieStore = await cookies()
    const token = cookieStore.get('staff_session')?.value
    if (token) {
      try {
        const { payload } = await jwtVerify(token, staffSecret)
        role = 'manager'
        storeId = payload.store_id as string
        staffName = payload.staff_name as string ?? null
        // Note: managers don't get inventory link — hasInventory stays false
      } catch {
        // Invalid token — middleware should have caught this, but be safe
      }
    }
  }

  // Query xero_connections to determine banner state
  // Only show banner when Xero was previously connected but is now disconnected or expired (D-06)
  // Only for owners — managers don't manage integrations
  let xeroStatus: 'connected' | 'disconnected' | 'token_expired' | null = null
  if (storeId && role === 'owner') {
    const adminClient = createSupabaseAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: xeroConn } = await (adminClient as any)
      .from('xero_connections')
      .select('status')
      .eq('store_id', storeId)
      .maybeSingle()
    xeroStatus = xeroConn?.status ?? null

    // Query store_plans for add-on feature flags (has_gift_cards)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: storePlan } = await (adminClient as any)
      .from('store_plans')
      .select('has_gift_cards')
      .eq('store_id', storeId)
      .maybeSingle()
    hasGiftCards = storePlan?.has_gift_cards === true
  }

  return (
    <div className="flex min-h-screen bg-bg">
      <AdminSidebar userEmail={userEmail} hasInventory={hasInventory} hasGiftCards={hasGiftCards} role={role} staffName={staffName} />
      <div className="flex-1 flex flex-col overflow-auto">
        <StripeTestModeBanner />
        {role === 'owner' && (xeroStatus === 'disconnected' || xeroStatus === 'token_expired') && (
          <XeroDisconnectBanner status={xeroStatus} />
        )}
        <main className="flex-1 p-4 pt-16 md:p-6 md:pt-6">
          {children}
        </main>
      </div>
    </div>
  )
}
