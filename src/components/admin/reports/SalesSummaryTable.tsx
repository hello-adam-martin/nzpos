'use client'

import { formatNZD } from '@/lib/money'

interface DailyTotal {
  date: string
  totalCents: number
  orderCount: number
  posCount: number
  onlineCount: number
}

interface SalesSummaryTableProps {
  dailyTotals: DailyTotal[]
}

export function SalesSummaryTable({ dailyTotals }: SalesSummaryTableProps) {
  const totals = dailyTotals.reduce(
    (acc, d) => ({
      totalCents: acc.totalCents + d.totalCents,
      orderCount: acc.orderCount + d.orderCount,
      posCount: acc.posCount + d.posCount,
      onlineCount: acc.onlineCount + d.onlineCount,
    }),
    { totalCents: 0, orderCount: 0, posCount: 0, onlineCount: 0 }
  )

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-navy text-white">
            <th className="px-4 py-3 text-left font-bold">Date</th>
            <th className="px-4 py-3 text-right font-bold">Orders</th>
            <th className="px-4 py-3 text-right font-bold">Revenue</th>
            <th className="px-4 py-3 text-right font-bold">POS</th>
            <th className="px-4 py-3 text-right font-bold">Online</th>
          </tr>
        </thead>
        <tbody>
          {dailyTotals.map((row, i) => (
            <tr
              key={row.date}
              className={`border-t border-border ${i % 2 === 0 ? 'bg-card' : 'bg-surface'}`}
            >
              <td className="px-4 py-3 font-mono text-primary">{row.date}</td>
              <td className="px-4 py-3 text-right font-mono text-primary">{row.orderCount}</td>
              <td className="px-4 py-3 text-right font-mono text-primary">{formatNZD(row.totalCents)}</td>
              <td className="px-4 py-3 text-right font-mono text-muted">{row.posCount}</td>
              <td className="px-4 py-3 text-right font-mono text-muted">{row.onlineCount}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-border bg-surface">
            <td className="px-4 py-3 font-bold text-primary">Total</td>
            <td className="px-4 py-3 text-right font-bold font-mono text-primary">{totals.orderCount}</td>
            <td className="px-4 py-3 text-right font-bold font-mono text-primary">{formatNZD(totals.totalCents)}</td>
            <td className="px-4 py-3 text-right font-bold font-mono text-primary">{totals.posCount}</td>
            <td className="px-4 py-3 text-right font-bold font-mono text-primary">{totals.onlineCount}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
