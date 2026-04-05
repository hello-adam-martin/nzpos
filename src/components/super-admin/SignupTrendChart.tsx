'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts'

interface SignupTrendDataPoint {
  date: string
  count: number
}

interface SignupTrendChartProps {
  data: SignupTrendDataPoint[]
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
      <p className="font-mono text-[var(--color-navy)]">{payload[0].value}</p>
    </div>
  )
}

export default function SignupTrendChart({ data }: SignupTrendChartProps) {
  const allZero = data.every(d => d.count === 0)

  return (
    <div className="bg-card border border-[var(--color-border)] shadow-sm rounded-[var(--radius-lg)] p-[var(--space-xl)]">
      <h2 className="text-base font-bold font-sans text-[var(--color-text)] mb-[var(--space-lg)]">
        Signup Trend — Last 30 Days
      </h2>

      {allZero ? (
        <div className="flex items-center justify-center py-8">
          <p className="text-sm text-[var(--color-text-muted)]">No signups in the last 30 days.</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="signupGradient" x1="0" y1="0" x2="0" y2="1">
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
              tickFormatter={(v: number) => String(v)}
              fontSize={14}
              fontFamily="'DM Sans'"
              width={40}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(30,41,59,0.08)' }} />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#1E293B"
              strokeWidth={2}
              fill="url(#signupGradient)"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
