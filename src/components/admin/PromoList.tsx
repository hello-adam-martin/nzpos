import type { Database } from '@/types/database'
import { formatNZD } from '@/lib/money'

type PromoCode = Database['public']['Tables']['promo_codes']['Row']

interface PromoListProps {
  promos: PromoCode[]
}

type PromoStatus = 'active' | 'expired' | 'maxed_out'

function getPromoStatus(promo: PromoCode): PromoStatus {
  const now = new Date()
  if (promo.expires_at && new Date(promo.expires_at) < now) {
    return 'expired'
  }
  if (promo.max_uses !== null && promo.current_uses >= promo.max_uses) {
    return 'maxed_out'
  }
  if (!promo.is_active) {
    return 'expired'
  }
  return 'active'
}

function StatusBadge({ status }: { status: PromoStatus }) {
  const styles: Record<PromoStatus, string> = {
    active: 'bg-success/10 text-success',
    expired: 'bg-error/10 text-error',
    maxed_out: 'bg-warning/10 text-warning',
  }
  const labels: Record<PromoStatus, string> = {
    active: 'Active',
    expired: 'Expired',
    maxed_out: 'Maxed Out',
  }
  return (
    <span
      className={[
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold font-sans',
        styles[status],
      ].join(' ')}
    >
      {labels[status]}
    </span>
  )
}

function formatDiscountValue(promo: PromoCode): string {
  if (promo.discount_type === 'percentage') {
    return `${promo.discount_value}%`
  }
  return `NZ${formatNZD(promo.discount_value)}`
}

function formatExpiry(expiresAt: string | null): string {
  if (!expiresAt) return 'No expiry'
  return new Date(expiresAt).toLocaleDateString('en-NZ', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function PromoList({ promos }: PromoListProps) {
  if (promos.length === 0) {
    return (
      <div className="bg-card rounded-[var(--radius-lg)] border border-border p-8 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[var(--color-surface)] mb-3">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--color-text-muted)]">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-[var(--color-text)] mb-1">No promo codes yet</p>
        <p className="text-sm text-[var(--color-text-muted)]">Create one above to offer discounts to your customers.</p>
      </div>
    )
  }

  return (
    <div className="bg-card rounded-[var(--radius-lg)] border border-border overflow-hidden">
      <div className="px-6 py-4 border-b border-border">
        <h2 className="font-display text-lg font-semibold text-primary">All Promo Codes</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm font-sans">
          <thead>
            <tr className="border-b border-border bg-surface">
              <th className="text-left px-6 py-3 font-semibold text-text-muted text-xs uppercase tracking-wide">
                Code
              </th>
              <th className="text-left px-6 py-3 font-semibold text-text-muted text-xs uppercase tracking-wide">
                Type / Value
              </th>
              <th className="text-left px-6 py-3 font-semibold text-text-muted text-xs uppercase tracking-wide">
                Min Order
              </th>
              <th className="text-left px-6 py-3 font-semibold text-text-muted text-xs uppercase tracking-wide">
                Uses
              </th>
              <th className="text-left px-6 py-3 font-semibold text-text-muted text-xs uppercase tracking-wide">
                Expiry
              </th>
              <th className="text-left px-6 py-3 font-semibold text-text-muted text-xs uppercase tracking-wide">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {promos.map((promo) => {
              const status = getPromoStatus(promo)
              return (
                <tr key={promo.id} className="hover:bg-surface/50 transition-colors duration-75">
                  <td className="px-6 py-4">
                    <span className="font-mono font-semibold text-primary tracking-wide">
                      {promo.code}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-text">
                    <span className="capitalize text-text-muted text-xs">
                      {promo.discount_type === 'percentage' ? 'Percentage' : 'Fixed'}
                    </span>
                    <br />
                    <span className="font-semibold text-text">
                      {formatDiscountValue(promo)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-text">
                    {promo.min_order_cents && promo.min_order_cents > 0
                      ? `NZ${formatNZD(promo.min_order_cents)}`
                      : <span className="text-text-muted">None</span>
                    }
                  </td>
                  <td className="px-6 py-4 text-text">
                    {promo.current_uses}
                    {promo.max_uses !== null ? ` / ${promo.max_uses}` : ' / unlimited'}
                  </td>
                  <td className="px-6 py-4 text-text">
                    {formatExpiry(promo.expires_at)}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={status} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
