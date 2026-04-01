import { formatNZD } from '@/lib/money'
import type { XeroSyncLogEntry } from '@/lib/xero/types'

interface Props {
  logs: XeroSyncLogEntry[]
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

export default function XeroSyncLog({ logs }: Props) {
  if (logs.length === 0) {
    return (
      <div className="py-8 text-center space-y-2">
        <p className="text-lg font-semibold font-sans text-[var(--color-text)]">
          No syncs yet
        </p>
        <p className="text-base font-sans text-[var(--color-text-muted)]">
          Your first automatic sync will run tonight at 2am NZST.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm font-sans">
        <thead>
          <tr className="border-b border-[var(--color-border)]">
            <th className="text-left py-2 pr-4 font-semibold text-[var(--color-text)] w-[120px]">
              Date
            </th>
            <th className="text-left py-2 pr-4 font-semibold text-[var(--color-text)] w-[160px]">
              Period
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
          {logs.map((entry) => (
            <tr
              key={entry.id}
              className="border-b border-[var(--color-border)] last:border-0 min-h-[48px]"
            >
              <td className="py-3 pr-4 text-[var(--color-text-muted)]">
                {entry.sync_date
                  ? new Date(entry.sync_date).toLocaleDateString('en-NZ', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })
                  : '—'}
              </td>
              <td className="py-3 pr-4 text-[var(--color-text-muted)] text-xs">
                {entry.period_from && entry.period_to
                  ? `${new Date(entry.period_from).toLocaleTimeString('en-NZ', { hour: '2-digit', minute: '2-digit' })} – ${new Date(entry.period_to).toLocaleTimeString('en-NZ', { hour: '2-digit', minute: '2-digit' })}`
                  : '—'}
              </td>
              <td className="py-3 pr-4">
                <SyncStatusBadge status={entry.status} />
              </td>
              <td
                className="py-3 pr-4 text-right text-[var(--color-text)]"
                style={{ fontFeatureSettings: "'tnum' 1" }}
              >
                {entry.total_cents != null ? formatNZD(entry.total_cents) : '—'}
              </td>
              <td className="py-3 pr-4 text-[var(--color-text-muted)]">
                {entry.xero_invoice_number ?? '—'}
              </td>
              <td className="py-3 max-w-[200px] truncate">
                {entry.error_message ? (
                  <span
                    className="text-[#DC2626]"
                    title={entry.error_message}
                  >
                    {entry.error_message}
                  </span>
                ) : (
                  <span className="text-[var(--color-text-muted)]">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
