import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import XeroConnectButton from '@/components/admin/integrations/XeroConnectButton'
import XeroAccountCodeForm from '@/components/admin/integrations/XeroAccountCodeForm'
import XeroSyncButton from '@/components/admin/integrations/XeroSyncButton'
import XeroSyncLog from '@/components/admin/integrations/XeroSyncLog'
import type { XeroConnection, XeroSyncLogEntry } from '@/lib/xero/types'

export const dynamic = 'force-dynamic'

export default async function IntegrationsPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const storeId = user?.app_metadata?.store_id as string | undefined
  if (!storeId) {
    redirect('/admin/login')
  }

  // Query xero_connections for current store
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adminSupabase = createSupabaseAdminClient() as any
  const { data: xeroConnRaw } = await adminSupabase
    .from('xero_connections')
    .select('*')
    .eq('store_id', storeId)
    .maybeSingle()

  const xeroConnection = xeroConnRaw as XeroConnection | null

  // Query xero_sync_log for current store, ordered by created_at DESC, limit 30
  const { data: syncLogRaw } = await adminSupabase
    .from('xero_sync_log')
    .select('*')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })
    .limit(30)

  const syncLogs = (syncLogRaw ?? []) as XeroSyncLogEntry[]

  const isConnected = xeroConnection?.status === 'connected'

  const cardClass = 'bg-card border border-[var(--color-border)] rounded-[var(--radius-lg)] p-6 shadow-sm'
  const sectionHeadingClass = 'text-lg font-semibold font-sans text-[var(--color-text)]'

  return (
    <div className="space-y-[var(--space-xl)] max-w-3xl">
      {/* Page heading */}
      <div>
        <h1 className="font-display font-semibold text-2xl text-[var(--color-text)]">
          Integrations
        </h1>
        <p className="mt-1 text-base font-sans text-[var(--color-text-muted)]">
          Connect your accounting software to sync sales automatically.
        </p>
      </div>

      {/* Card: Xero Connection */}
      <section className={cardClass}>
        <div className="space-y-[var(--space-md)]">
          <h2 className={sectionHeadingClass}>Xero</h2>
          <XeroConnectButton connection={xeroConnection} />
        </div>
      </section>

      {/* Card: Account Codes (only visible when connected) */}
      {isConnected && (
        <section className={cardClass}>
          <div className="space-y-[var(--space-md)]">
            <h2 className={sectionHeadingClass}>Account Codes</h2>
            <XeroAccountCodeForm connection={xeroConnection} />
          </div>
        </section>
      )}

      {/* Card: Daily Sync + Sync Log */}
      <section className={cardClass}>
        <div className="space-y-[var(--space-md)]">
          {/* Daily Sync section */}
          <h2 className={sectionHeadingClass}>Daily Sync</h2>
          <p className="text-sm font-sans text-[var(--color-text-muted)]">
            Sales sync automatically at 2am NZST. Run a manual sync to push today&apos;s sales now.
          </p>
          <XeroSyncButton isConnected={isConnected} />

          {/* Sync Log section */}
          <h3 className="text-base font-semibold font-sans text-[var(--color-text)] pt-2">
            Sync Log
          </h3>
          <XeroSyncLog logs={syncLogs} />
        </div>
      </section>
    </div>
  )
}
