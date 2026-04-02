import AdminSidebar from '@/components/admin/AdminSidebar'
import XeroDisconnectBanner from '@/components/admin/integrations/XeroDisconnectBanner'
import StripeTestModeBanner from '@/components/StripeTestModeBanner'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userEmail = user?.email ?? null
  const storeId = user?.app_metadata?.store_id as string | undefined

  // Query xero_connections to determine banner state
  // Only show banner when Xero was previously connected but is now disconnected or expired (D-06)
  // Null means never connected — NO banner in that case
  let xeroStatus: 'connected' | 'disconnected' | 'token_expired' | null = null
  if (storeId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: xeroConn } = await (createSupabaseAdminClient() as any)
      .from('xero_connections')
      .select('status')
      .eq('store_id', storeId)
      .maybeSingle()
    xeroStatus = xeroConn?.status ?? null
  }

  return (
    <div className="flex min-h-screen bg-bg">
      <AdminSidebar userEmail={userEmail} />
      <div className="flex-1 flex flex-col overflow-auto">
        <StripeTestModeBanner />
        {(xeroStatus === 'disconnected' || xeroStatus === 'token_expired') && (
          <XeroDisconnectBanner status={xeroStatus} />
        )}
        <main className="flex-1 p-4 pt-16 md:p-6 md:pt-6">
          {children}
        </main>
      </div>
    </div>
  )
}
