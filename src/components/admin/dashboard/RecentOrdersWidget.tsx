import { formatNZD } from '@/lib/money'
import { format } from 'date-fns'

interface Order {
  id: string
  created_at: string
  total_cents: number
  status: string
}

interface RecentOrdersWidgetProps {
  orders: Order[]
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'completed' || status === 'collected') {
    const label = status === 'collected' ? 'Collected' : 'Completed'
    return (
      <span className="rounded-full text-xs font-bold px-2 py-0.5 bg-[var(--color-success)]/10 text-[var(--color-success)]">
        {label}
      </span>
    )
  }
  if (status === 'pending_pickup' || status === 'ready') {
    const label = status === 'ready' ? 'Ready' : 'Pending Pickup'
    return (
      <span className="rounded-full text-xs font-bold px-2 py-0.5 bg-[var(--color-warning)]/10 text-[var(--color-warning)]">
        {label}
      </span>
    )
  }
  if (status === 'refunded') {
    return (
      <span className="rounded-full text-xs font-bold px-2 py-0.5 bg-[var(--color-error)]/10 text-[var(--color-error)]">
        Refunded
      </span>
    )
  }
  return (
    <span className="rounded-full text-xs font-bold px-2 py-0.5 bg-[var(--color-surface)] text-[var(--color-text-muted)]">
      {status}
    </span>
  )
}

export function RecentOrdersWidget({ orders }: RecentOrdersWidgetProps) {
  return (
    <div className="bg-card border border-[var(--color-border)] shadow-sm rounded-[var(--radius-lg)] p-[var(--space-xl)]">
      <h2 className="text-base font-bold font-sans mb-[var(--space-lg)]">Recent Orders</h2>

      {orders.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)] text-center py-8">No orders yet.</p>
      ) : (
        <div className="divide-y divide-[var(--color-border-light)]">
          {orders.map(order => (
            <div
              key={order.id}
              className="flex items-center gap-[var(--space-md)] py-[var(--space-sm)]"
            >
              <span className="font-mono text-sm text-[var(--color-navy)] min-w-[90px]">
                #{order.id.slice(0, 8)}
              </span>
              <span className="text-sm text-[var(--color-text-muted)] min-w-[60px]">
                {format(new Date(order.created_at), 'dd MMM')}
              </span>
              <span className="text-sm text-[var(--color-text)] flex-1">
                {formatNZD(order.total_cents)}
              </span>
              <StatusBadge status={order.status} />
            </div>
          ))}
        </div>
      )}

      <div className="pt-[var(--space-sm)]">
        <a
          href="/admin/orders"
          className="text-sm text-[var(--color-navy)] font-bold hover:underline"
        >
          View all orders
        </a>
      </div>
    </div>
  )
}
