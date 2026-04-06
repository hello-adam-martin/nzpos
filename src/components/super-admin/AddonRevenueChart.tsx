'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts'

interface AddonRevenueDataPoint {
  name: string
  mrr: number
}

interface AddonRevenueChartProps {
  data: AddonRevenueDataPoint[]
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
      <p className="font-mono text-[var(--color-navy)]">${payload[0].value} MRR/month</p>
    </div>
  )
}

export default function AddonRevenueChart({ data }: AddonRevenueChartProps) {
  const isEmpty = data.length === 0 || data.every(d => d.mrr === 0)
  const dynamicHeight = Math.max(4, data.length) * 52 + 32

  return (
    <div className="bg-card border border-[var(--color-border)] shadow-sm rounded-[var(--radius-lg)] p-[var(--space-xl)]">
      <figure>
        <figcaption className="text-base font-semibold font-sans text-[var(--color-text)] mb-[var(--space-lg)]">
          Revenue by Add-on
        </figcaption>

        {isEmpty ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-sm text-[var(--color-text-muted)]">
              No revenue data yet. Run a sync to populate.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={dynamicHeight}>
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                horizontal={false}
                vertical={true}
                stroke="#E7E5E4"
                strokeDasharray="4 4"
              />
              <XAxis
                type="number"
                tickFormatter={(v: number) => '$' + v}
                fontSize={14}
                fontFamily="'DM Sans'"
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={140}
                fontSize={14}
                fontFamily="'DM Sans'"
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(30,41,59,0.08)' }} />
              <Bar
                dataKey="mrr"
                fill="#1E293B"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </figure>
    </div>
  )
}
