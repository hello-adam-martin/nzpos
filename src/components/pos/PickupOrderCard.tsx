'use client'

import { useTransition } from 'react'
import { format } from 'date-fns'
import { formatNZD } from '@/lib/money'
import { updateOrderStatus } from '@/actions/orders/updateOrderStatus'

type PickupOrderItem = {
  product_name: string
  quantity: number
}

type PickupOrder = {
  id: string
  status: string
  total_cents: number
  customer_email: string | null
  created_at: string
  items: PickupOrderItem[]
}

type PickupOrderCardProps = {
  order: PickupOrder
}

export function PickupOrderCard({ order }: PickupOrderCardProps) {
  const [isPending, startTransition] = useTransition()

  const shortId = order.id.slice(0, 8).toUpperCase()
  const orderDate = format(new Date(order.created_at), 'dd MMM yyyy, h:mm a')

  function handleMarkReady() {
    startTransition(async () => {
      await updateOrderStatus({ orderId: order.id, newStatus: 'ready' })
    })
  }

  function handleMarkCollected() {
    startTransition(async () => {
      await updateOrderStatus({ orderId: order.id, newStatus: 'collected' })
    })
  }

  return (
    <div className="bg-card rounded-lg border border-border p-4 flex flex-col gap-3">
      {/* Header: order ID + status badge */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="font-mono text-sm font-semibold text-text">#{shortId}</span>
          {order.customer_email && (
            <p className="text-sm text-muted mt-0.5">{order.customer_email}</p>
          )}
          <p className="text-xs text-muted mt-0.5">{orderDate}</p>
        </div>
        <div>
          {order.status === 'pending_pickup' && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600">
              Awaiting Pickup
            </span>
          )}
          {order.status === 'ready' && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-600">
              Ready for Collection
            </span>
          )}
        </div>
      </div>

      {/* Item list */}
      <ul className="space-y-1">
        {order.items.map((item, i) => (
          <li key={i} className="text-sm text-text flex justify-between">
            <span>{item.product_name}</span>
            <span className="text-muted">x{item.quantity}</span>
          </li>
        ))}
      </ul>

      {/* Total + action */}
      <div className="flex items-center justify-between pt-2 border-t border-border-light">
        <span className="font-semibold text-text">{formatNZD(order.total_cents)}</span>
        <div>
          {order.status === 'pending_pickup' && (
            <button
              onClick={handleMarkReady}
              disabled={isPending}
              className="px-4 py-2 rounded-lg bg-navy text-white text-sm font-medium disabled:opacity-50 cursor-pointer"
            >
              {isPending ? 'Updating…' : 'Mark Ready'}
            </button>
          )}
          {order.status === 'ready' && (
            <button
              onClick={handleMarkCollected}
              disabled={isPending}
              className="px-4 py-2 rounded-lg bg-amber text-white text-sm font-medium disabled:opacity-50 cursor-pointer"
            >
              {isPending ? 'Updating…' : 'Mark Collected'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
