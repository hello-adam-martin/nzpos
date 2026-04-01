import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import XeroConnectButton from '@/components/admin/integrations/XeroConnectButton'
import XeroAccountCodeForm from '@/components/admin/integrations/XeroAccountCodeForm'
import { formatNZD } from '@/lib/money'
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

  const syncLog = (syncLogRaw ?? []) as XeroSyncLogEntry[]

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
      {xeroConnection?.status === 'connected' && (
        <section className={cardClass}>
          <div className="space-y-[var(--space-md)]">
            <h2 className={sectionHeadingClass}>Account Codes</h2>
            <XeroAccountCodeForm connection={xeroConnection} />
          </div>
        </section>
      )}

      {/* Card: Sync Log */}
      <section className={cardClass}>
        <div className="space-y-[var(--space-md)]">
          <div className="flex items-center justify-between">
            <h2 className={sectionHeadingClass}>Daily Sync</h2>
          </div>
          <p className="text-sm font-sans text-[var(--color-text-muted)]">
            Sales sync automatically at 2am NZST. Run a manual sync to push today&apos;s sales now.
          </p>

          {/* XeroSyncButton placeholder — wired in Plan 04 */}
          <div className="opacity-50">
            <button
              disabled
              className="inline-flex items-center bg-amber text-white font-semibold font-sans px-4 py-2 rounded-[var(--radius-md)] text-sm cursor-not-allowed"
              title="Manual sync will be available after connecting Xero"
            >
              Sync Today&apos;s Sales
            </button>
          </div>

          {/* Sync Log */}
          <h3 className="text-base font-semibold font-sans text-[var(--color-text)] pt-2">
            Sync Log
          </h3>
          {syncLog.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <p className="text-base font-semibold font-sans text-[var(--color-text)]">
                No syncs yet
              </p>
              <p className="text-sm font-sans text-[var(--color-text-muted)]">
                Your first automatic sync will run tonight at 2am NZST.{' '}
                {!xeroConnection && 'Connect Xero above to get started.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm font-sans">
                <thead>
                  <tr className="border-b border-[var(--color-border)]">
                    <th className="text-left py-2 pr-4 font-semibold text-[var(--color-text)] w-[120px]">
                      Date
                    </th>
                    <th className="text-left py-2 pr-4 font-semibold text-[var(--color-text)] w-[80px]">
                      Type
                    </th>
                    <th className="text-left py-2 pr-4 font-semibold text-[var(--color-text)] w-[100px]">
                      Status
                    </th>
                    <th
                      className="text-right py-2 pr-4 font-semibold text-[var(--color-text)] w-[100px]"
                      style={{ fontFeatureSettings: "'tnum' 1" }}
                    >
                      Total
                    </th>
                    <th className="text-left py-2 pr-4 font-semibold text-[var(--color-text)]">
                      Invoice #
                    </th>
                    <th className="text-left py-2 font-semibold text-[var(--color-text)]">
                      Error
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {syncLog.map(entry => (
                    <tr
                      key={entry.id}
                      className="border-b border-[var(--color-border-light)] last:border-0"
                    >
                      <td className="py-2 pr-4 text-[var(--color-text-muted)]">
                        {entry.sync_date
                          ? new Date(entry.sync_date).toLocaleDateString('en-NZ', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })
                          : '—'}
                      </td>
                      <td className="py-2 pr-4 text-[var(--color-text-muted)] capitalize">
                        {entry.sync_type}
                      </td>
                      <td className="py-2 pr-4">
                        <SyncStatusBadge status={entry.status} />
                      </td>
                      <td
                        className="py-2 pr-4 text-right text-[var(--color-text)]"
                        style={{ fontFeatureSettings: "'tnum' 1" }}
                      >
                        {entry.total_cents != null ? formatNZD(entry.total_cents) : '—'}
                      </td>
                      <td className="py-2 pr-4 text-[var(--color-text-muted)]">
                        {entry.xero_invoice_number ?? '—'}
                      </td>
                      <td className="py-2 text-[var(--color-text-muted)] max-w-[200px] truncate">
                        {entry.error_message ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function SyncStatusBadge({ status }: { status: XeroSyncLogEntry['status'] }) {
  const styles: Record<XeroSyncLogEntry['status'], { bg: string; color: string; label: string }> = {
    success: { bg: '#D1FAE5', color: '#065F46', label: 'Success' },
    failed: { bg: '#FEE2E2', color: '#991B1B', label: 'Failed' },
    pending: { bg: '#FEF3C7', color: '#92400E', label: 'Pending' },
  }
  const s = styles[status] ?? styles.pending
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium font-sans"
      style={{ backgroundColor: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  )
}
