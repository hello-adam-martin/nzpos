'use client'

type OrderNotificationBadgeProps = {
  count: number
}

export function OrderNotificationBadge({ count }: OrderNotificationBadgeProps) {
  if (count === 0) return null

  const label = count > 9 ? '9+' : String(count)

  return (
    <span
      className="absolute -top-1.5 -right-2.5 flex items-center justify-center min-w-[20px] h-5 px-1 rounded-full bg-amber text-white text-[11px] font-semibold border-2 border-navy"
      aria-label={`${count} unread orders`}
    >
      {label}
    </span>
  )
}
