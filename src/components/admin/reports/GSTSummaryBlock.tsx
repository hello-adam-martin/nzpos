'use client'

import { useState } from 'react'
import { formatNZD } from '@/lib/money'

interface GSTLineDetail {
  order_id: string
  product_name: string
  line_total_cents: number
  gst_cents: number
}

interface GSTSummaryBlockProps {
  totalSalesCents: number
  totalGSTCents: number
  gstExclusiveCents: number
  refundedTotalCents: number
  refundedGSTCents: number
  lineDetail: GSTLineDetail[]
}

export function GSTSummaryBlock({
  totalSalesCents,
  totalGSTCents,
  gstExclusiveCents,
  refundedTotalCents,
  refundedGSTCents,
  lineDetail,
}: GSTSummaryBlockProps) {
  const [activeView, setActiveView] = useState<'summary' | 'detail'>('summary')

  const totalLineAmount = lineDetail.reduce((s, d) => s + d.line_total_cents, 0)
  const totalLineGST = lineDetail.reduce((s, d) => s + d.gst_cents, 0)

  return (
    <div className="bg-card rounded-lg border border-border p-[var(--space-lg)]">
      {/* Tab pills */}
      <div className="flex gap-2 mb-[var(--space-lg)]">
        <button
          onClick={() => setActiveView('summary')}
          className={
            activeView === 'summary'
              ? 'bg-navy text-white px-3 py-1 rounded-full text-sm font-bold'
              : 'bg-transparent border border-border text-navy px-3 py-1 rounded-full text-sm font-bold hover:bg-surface'
          }
        >
          Summary
        </button>
        <button
          onClick={() => setActiveView('detail')}
          className={
            activeView === 'detail'
              ? 'bg-navy text-white px-3 py-1 rounded-full text-sm font-bold'
              : 'bg-transparent border border-border text-navy px-3 py-1 rounded-full text-sm font-bold hover:bg-surface'
          }
        >
          Per-line Detail
        </button>
      </div>

      {activeView === 'summary' && (
        <div className="space-y-[var(--space-md)]">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <SummaryCard label="Total Sales (inc. GST)" value={formatNZD(totalSalesCents)} />
            <SummaryCard label="GST Collected" value={formatNZD(totalGSTCents)} />
            <SummaryCard label="Sales (excl. GST)" value={formatNZD(gstExclusiveCents)} />
          </div>

          {refundedTotalCents > 0 && (
            <div className="border-t border-border pt-[var(--space-md)] space-y-2">
              <p className="text-sm font-bold text-muted uppercase tracking-wide">Refunds (excluded from above)</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex items-center justify-between bg-surface rounded-md px-4 py-3">
                  <span className="text-sm font-bold text-primary">Refunds</span>
                  <span className="font-mono text-error">-{formatNZD(refundedTotalCents)}</span>
                </div>
                <div className="flex items-center justify-between bg-surface rounded-md px-4 py-3">
                  <span className="text-sm font-bold text-primary">Refund GST</span>
                  <span className="font-mono text-error">-{formatNZD(refundedGSTCents)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeView === 'detail' && (
        <div>
          {lineDetail.length === 0 ? (
            <p className="text-muted text-sm">No per-line detail available. Make sure you have completed orders in this period.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-navy text-white">
                    <th className="px-4 py-3 text-left font-bold">Order ID</th>
                    <th className="px-4 py-3 text-left font-bold">Product</th>
                    <th className="px-4 py-3 text-right font-bold">Line Amount</th>
                    <th className="px-4 py-3 text-right font-bold">GST</th>
                  </tr>
                </thead>
                <tbody>
                  {lineDetail.map((row, i) => (
                    <tr
                      key={`${row.order_id}-${i}`}
                      className={`border-t border-border ${i % 2 === 0 ? 'bg-card' : 'bg-surface'}`}
                    >
                      <td className="px-4 py-3 font-mono text-muted">{row.order_id.slice(0, 8)}</td>
                      <td className="px-4 py-3 text-primary">{row.product_name}</td>
                      <td className="px-4 py-3 text-right font-mono text-primary">{formatNZD(row.line_total_cents)}</td>
                      <td className="px-4 py-3 text-right font-mono text-primary">{formatNZD(row.gst_cents)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border bg-surface">
                    <td className="px-4 py-3 font-bold text-primary" colSpan={2}>Total</td>
                    <td className="px-4 py-3 text-right font-bold font-mono text-primary">{formatNZD(totalLineAmount)}</td>
                    <td className="px-4 py-3 text-right font-bold font-mono text-primary">{formatNZD(totalLineGST)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface rounded-md px-4 py-4">
      <p className="text-sm font-bold text-muted mb-1">{label}</p>
      <p className="font-mono text-xl text-primary">{value}</p>
    </div>
  )
}
