export default function StaffLoading() {
  return (
    <div className="flex flex-col gap-6">
      {/* Page header skeleton */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-2">
          <div className="h-6 w-16 bg-border animate-pulse rounded-[var(--radius-md)]" />
          <div className="h-4 w-48 bg-border animate-pulse rounded-[var(--radius-md)]" />
        </div>
        <div className="h-9 w-36 bg-border animate-pulse rounded-[var(--radius-md)]" />
      </div>

      {/* Table skeleton */}
      <div className="rounded-[var(--radius-md)] border border-border overflow-hidden">
        {/* Header */}
        <div className="bg-navy h-11" />

        {/* 5 skeleton rows */}
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-4 border-t border-border min-h-[48px] py-3"
          >
            {/* Name — 60% width */}
            <div className="flex-1 h-4 bg-border animate-pulse rounded" style={{ maxWidth: '60%' }} />
            {/* Role — 80px */}
            <div className="w-20 h-5 bg-border animate-pulse rounded-full" />
            {/* Status — 60px */}
            <div className="w-16 h-5 bg-border animate-pulse rounded-full" />
            {/* Actions — hidden */}
          </div>
        ))}
      </div>
    </div>
  )
}
