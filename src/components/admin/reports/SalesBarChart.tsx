'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { formatNZD } from '@/lib/money'

interface SalesBarChartProps {
  data: Array<{ date: string; totalCents: number }>
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="bg-card border border-border rounded-md px-3 py-2 text-sm shadow-md">
      <p className="font-bold text-primary mb-1">{label}</p>
      <p className="font-mono text-primary">{formatNZD(payload[0].value)}</p>
    </div>
  )
}

export function SalesBarChart({ data }: SalesBarChartProps) {
  const formattedData = data.map(d => ({
    date: d.date.slice(5), // MM-DD for display
    totalCents: d.totalCents,
    fullDate: d.date,
  }))

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={formattedData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
        <XAxis
          dataKey="date"
          tick={{ fontSize: 12, fontFamily: 'DM Sans' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v: number) => '$' + (v / 100).toFixed(0)}
          tick={{ fontSize: 12, fontFamily: 'DM Sans' }}
          axisLine={false}
          tickLine={false}
          width={60}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(30,41,59,0.08)' }} />
        <Bar
          dataKey="totalCents"
          fill="#1E293B"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
