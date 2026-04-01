'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { formatNZD } from '@/lib/money'

interface ChannelBreakdownChartProps {
  posTotalCents: number
  onlineTotalCents: number
}

const COLORS = {
  pos: '#1E293B',    // navy
  online: '#3B82F6', // info-blue
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number }> }) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="bg-card border border-border rounded-md px-3 py-2 text-sm shadow-md">
      <p className="font-bold text-primary mb-1">{payload[0].name}</p>
      <p className="font-mono text-primary">{formatNZD(payload[0].value)}</p>
    </div>
  )
}

export function ChannelBreakdownChart({ posTotalCents, onlineTotalCents }: ChannelBreakdownChartProps) {
  const total = posTotalCents + onlineTotalCents

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-[240px] text-muted text-sm">
        No sales data
      </div>
    )
  }

  const data = [
    { name: 'POS', value: posTotalCents },
    { name: 'Online', value: onlineTotalCents },
  ]

  return (
    <div>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            strokeWidth={0}
          >
            <Cell fill={COLORS.pos} />
            <Cell fill={COLORS.online} />
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex gap-[var(--space-md)] justify-center mt-2 text-sm">
        <div className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.pos }} />
          <span className="text-primary">POS: <span className="font-mono">{formatNZD(posTotalCents)}</span></span>
        </div>
        <div className="flex items-center gap-1">
          <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.online }} />
          <span className="text-primary">Online: <span className="font-mono">{formatNZD(onlineTotalCents)}</span></span>
        </div>
      </div>
    </div>
  )
}
