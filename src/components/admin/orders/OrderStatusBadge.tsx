'use client'

type OrderStatus =
  | 'pending'
  | 'completed'
  | 'refunded'
  | 'expired'
  | 'pending_pickup'
  | 'ready'
  | 'collected'

interface OrderStatusBadgeProps {
  status: OrderStatus
}

const STATUS_STYLES: Record<OrderStatus, string> = {
  completed: 'bg-[var(--color-success)]/15 text-[var(--color-success)]',
  refunded: 'bg-[var(--color-error)]/15 text-[var(--color-error)]',
  pending_pickup: 'bg-[var(--color-warning)]/15 text-[var(--color-warning)]',
  ready: 'bg-[var(--color-info)]/15 text-[var(--color-info)]',
  collected: 'bg-[var(--color-success)]/10 text-[var(--color-success)]',
  pending: 'bg-surface text-text-muted',
  expired: 'bg-surface text-text-muted',
}

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pending',
  completed: 'Completed',
  refunded: 'Refunded',
  expired: 'Expired',
  pending_pickup: 'Pending Pickup',
  ready: 'Ready',
  collected: 'Collected',
}

export function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold',
        STATUS_STYLES[status],
      ].join(' ')}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}
