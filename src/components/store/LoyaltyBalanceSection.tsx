import { format } from 'date-fns'
import { formatNZD } from '@/lib/money'
import type { LoyaltyTransaction } from '@/actions/loyalty/getCustomerLoyalty'

interface LoyaltyBalanceSectionProps {
  pointsBalance: number
  redeemRateCents: number
  dollarValue: number
  transactions: LoyaltyTransaction[]
}

/**
 * Loyalty balance and transaction history section for the account profile page.
 *
 * Displays:
 * - Current points balance (DM Sans 20px/700, tabular nums)
 * - Equivalent dollar value below in label size
 * - Recent transactions table (last 10): date, description, points delta
 *
 * Per UI-SPEC LoyaltyBalanceSection spec (LOYAL-07).
 */
export function LoyaltyBalanceSection({
  pointsBalance,
  dollarValue,
  transactions,
}: LoyaltyBalanceSectionProps) {
  return (
    <div className="rounded-lg bg-[var(--color-card)] border border-[var(--color-border)] p-6">
      {/* Heading */}
      <h2
        className="text-[1.25rem] font-bold text-[var(--color-text)] mb-4"
        style={{ fontFamily: 'DM Sans, sans-serif', lineHeight: '1.2' }}
      >
        Loyalty Points
      </h2>

      {/* Balance display */}
      <div className="mb-5">
        <p
          className="text-[1.25rem] font-bold text-[var(--color-text)]"
          style={{
            fontFamily: 'DM Sans, sans-serif',
            lineHeight: '1.25',
            fontFeatureSettings: "'tnum' 1",
          }}
        >
          {pointsBalance} pts
        </p>
        <p
          className="text-[0.875rem] text-[var(--color-text-muted)] mt-0.5"
          style={{
            fontFamily: 'DM Sans, sans-serif',
            fontFeatureSettings: "'tnum' 1",
          }}
        >
          Worth {formatNZD(dollarValue)}
        </p>
      </div>

      {/* Transaction history */}
      <div>
        <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wide mb-3">
          Recent Activity
        </p>

        {transactions.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">No loyalty transactions yet.</p>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {transactions.map((tx) => (
              <div key={tx.id} className="py-2.5 flex items-center justify-between gap-4">
                {/* Date + description */}
                <div className="min-w-0">
                  <p className="text-xs text-[var(--color-text-muted)]">
                    {format(new Date(tx.createdAt), 'd MMM yyyy')}
                  </p>
                  <p className="text-sm text-[var(--color-text)] truncate">
                    {tx.transactionType === 'earn'
                      ? 'Earned from order'
                      : tx.transactionType === 'redeem'
                        ? 'Redeemed on order'
                        : 'Adjustment'}
                    {tx.orderId && (
                      <span
                        className="ml-1.5 text-xs text-[var(--color-text-muted)]"
                        style={{ fontFamily: 'Geist Mono, monospace' }}
                      >
                        {tx.orderId.slice(0, 8)}
                      </span>
                    )}
                  </p>
                </div>

                {/* Points delta */}
                <p
                  className="text-sm font-semibold shrink-0 tabular-nums"
                  style={{
                    fontFeatureSettings: "'tnum' 1",
                    color: tx.pointsDelta >= 0 ? '#059669' : '#E67E22',
                  }}
                >
                  {tx.pointsDelta >= 0 ? '+' : ''}{tx.pointsDelta}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
