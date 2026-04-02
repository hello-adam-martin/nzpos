'use client'
import { formatNZD } from '@/lib/money'

type NewOrderToastProps = {
  count: number
  totalCents: number | null
}

export function NewOrderToast({ count, totalCents }: NewOrderToastProps) {
  const heading = count === 1 ? 'New order' : `${count} new orders`
  const body =
    count === 1 && totalCents !== null
      ? `${formatNZD(totalCents)} — tap Pickups to view`
      : 'Tap Pickups to view all orders'

  return (
    <div
      className="fixed bottom-4 right-4 w-[280px] bg-surface border border-border rounded-lg shadow-md p-3 px-4 animate-slide-up z-50"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2 mb-0.5">
        <span className="w-2 h-2 rounded-full bg-amber shrink-0" />
        <p className="text-sm font-semibold text-text">{heading}</p>
      </div>
      <p className="text-sm text-text-muted pl-4">{body}</p>
    </div>
  )
}
