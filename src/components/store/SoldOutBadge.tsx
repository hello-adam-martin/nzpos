// Server Component — no 'use client' needed
export function SoldOutBadge() {
  return (
    <span className="absolute top-2 left-2 bg-error text-white text-sm font-semibold px-2 py-1 rounded-md z-10 pointer-events-none">
      Sold Out
    </span>
  )
}
