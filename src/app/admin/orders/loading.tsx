export default function OrdersLoading() {
  return (
    <div className="space-y-[var(--space-lg)]">
      <div className="h-10 w-40 bg-surface animate-pulse rounded-[var(--radius-md)]" />
      {/* Filter bar skeleton */}
      <div className="flex items-center gap-3 flex-wrap">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-10 w-32 bg-surface animate-pulse rounded-[var(--radius-md)]" />
        ))}
      </div>
      {/* Table skeleton */}
      <div className="overflow-x-auto rounded-[var(--radius-md)] border border-border">
        <div className="bg-navy h-12 rounded-t-[var(--radius-md)]" />
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-4 py-3 border-b border-border last:border-0"
          >
            {[1, 2, 3, 4, 5, 6, 7].map((j) => (
              <div
                key={j}
                className="h-4 bg-surface animate-pulse rounded flex-1"
                style={{ animationDelay: `${(i * 7 + j) * 50}ms` }}
              />
            ))}
          </div>
        ))}
      </div>
      <p className="text-sm font-sans text-text-muted text-center">Loading orders...</p>
    </div>
  )
}
