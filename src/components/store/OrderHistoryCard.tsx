import Link from 'next/link'
import { formatNZD } from '@/lib/money'

type Props = {
  order: {
    id: string
    created_at: string
    status: string
    total_cents: number
    item_count: number
  }
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  pending: { label: 'Pending', bg: '#EFF6FF', text: '#1D4ED8' },
  completed: { label: 'Processing', bg: '#EFF6FF', text: '#1D4ED8' },
  pending_pickup: { label: 'Awaiting Pickup', bg: '#FEF3C7', text: '#92400E' },
  ready: { label: 'Ready for Collection', bg: '#D1FAE5', text: '#065F46' },
  collected: { label: 'Collected', bg: '#F3F4F6', text: '#374151' },
  refunded: { label: 'Refunded', bg: '#FEE2E2', text: '#991B1B' },
}

export function OrderHistoryCard({ order }: Props) {
  const statusConfig = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending
  const orderNumber = `#${order.id.slice(0, 8).toUpperCase()}`
  const dateStr = new Date(order.created_at).toLocaleDateString('en-NZ', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  return (
    <Link
      href={`/account/orders/${order.id}`}
      className="block rounded-lg p-4 bg-card border border-border shadow-sm hover:shadow-md transition-shadow duration-150"
    >
      <div className="flex items-center justify-between gap-4">
        {/* Left: date, order number, item count */}
        <div className="flex flex-col gap-0.5 min-w-0">
          <span className="text-xs text-text-muted">{dateStr}</span>
          <span className="font-mono text-sm text-text">{orderNumber}</span>
          <span className="text-xs text-text-muted">
            {order.item_count} {order.item_count === 1 ? 'item' : 'items'}
          </span>
        </div>

        {/* Right: status pill + total */}
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span
            className="inline-block px-3 py-1 rounded-full text-sm font-semibold"
            style={{ backgroundColor: statusConfig.bg, color: statusConfig.text }}
          >
            {statusConfig.label}
          </span>
          <span className="text-base font-semibold tabular-nums text-text">
            {formatNZD(order.total_cents)}
          </span>
        </div>
      </div>
    </Link>
  )
}
