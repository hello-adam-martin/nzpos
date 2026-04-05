'use client'

import { useState } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts'
import { formatNZD } from '@/lib/money'
import { PeriodToggle } from './PeriodToggle'

interface TrendDataPoint {
  date: string
  totalCents: number
}

interface SalesTrendChartProps {
  data7: TrendDataPoint[]
  data30: TrendDataPoint[]
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
}) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="bg-card border border-[var(--color-border)] rounded-md px-3 py-2 text-sm shadow-md">
      <p className="font-bold text-[var(--color-navy)] mb-1">{label}</p>
      <p className="font-mono text-[var(--color-navy)]">{formatNZD(payload[0].value)}</p>
    </div>
  )
}

export function SalesTrendChart({ data7, data30 }: SalesTrendChartProps) {
  const [period, setPeriod] = useState<7 | 30>(7)
  const data = period === 7 ? data7 : data30

  const allZero = data.every(d => d.totalCents === 0)

  return (
    <div className="bg-card border border-[var(--color-border)] shadow-sm rounded-[var(--radius-lg)] p-[var(--space-xl)]">
      <div className="flex items-center justify-between mb-[var(--space-lg)]">
        <h2 className="text-base font-bold font-sans text-[var(--color-text)]">Sales Trend</h2>
        <PeriodToggle period={period} onChange={setPeriod} />
      </div>

      {allZero ? (
        <div className="flex items-center justify-center py-8">
          <p className="text-sm text-[var(--color-text-muted)]">No sales data for this period.</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#E67E22" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#E67E22" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              horizontal={true}
              vertical={false}
              stroke="#E7E5E4"
              strokeDasharray="4 4"
            />
            <XAxis
              dataKey="date"
              fontSize={14}
              fontFamily="'DM Sans'"
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v: number) => `$${Math.round(v / 100)}`}
              fontSize={14}
              fontFamily="'DM Sans'"
              width={60}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(30,41,59,0.08)' }} />
            <Area
              type="monotone"
              dataKey="totalCents"
              stroke="#1E293B"
              strokeWidth={2}
              fill="url(#salesGradient)"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
