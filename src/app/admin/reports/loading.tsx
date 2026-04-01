export default function ReportsLoading() {
  return (
    <div className="space-y-[var(--space-xl)]">
      <div className="h-8 w-48 bg-surface rounded-md animate-pulse" />

      {/* Date range picker skeleton */}
      <div className="flex gap-2 flex-wrap">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="h-8 w-24 bg-surface rounded-full animate-pulse" />
        ))}
      </div>

      {/* Charts skeleton */}
      <div className="grid grid-cols-3 gap-[var(--space-lg)]">
        <div className="col-span-2 h-64 bg-surface rounded-lg animate-pulse" />
        <div className="h-64 bg-surface rounded-lg animate-pulse" />
      </div>

      {/* Table skeleton */}
      <div className="space-y-2">
        <div className="h-12 bg-navy rounded-t-lg animate-pulse" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 bg-surface rounded animate-pulse" />
        ))}
      </div>

      <p className="text-muted text-sm text-center">Loading reports...</p>
    </div>
  )
}
