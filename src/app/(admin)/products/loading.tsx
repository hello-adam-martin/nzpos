export default function ProductsLoading() {
  return (
    <div className="flex gap-0 flex-1 min-h-0">
      {/* Main content area */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        {/* Page header skeleton */}
        <div className="flex items-center justify-between">
          <div className="h-8 w-32 bg-surface animate-pulse rounded-[var(--radius-md)]" />
          <div className="flex gap-3">
            <div className="h-9 w-28 bg-surface animate-pulse rounded-[var(--radius-md)]" />
            <div className="h-9 w-32 bg-surface animate-pulse rounded-[var(--radius-md)]" />
          </div>
        </div>

        {/* Search bar skeleton */}
        <div className="h-10 bg-surface animate-pulse rounded-[var(--radius-md)]" />

        {/* Filter bar skeleton */}
        <div className="flex gap-3">
          <div className="h-9 w-40 bg-surface animate-pulse rounded-[var(--radius-md)]" />
          <div className="h-9 w-36 bg-surface animate-pulse rounded-[var(--radius-md)]" />
          <div className="h-9 w-28 bg-surface animate-pulse rounded-[var(--radius-md)]" />
        </div>

        {/* Table skeleton */}
        <div className="rounded-[var(--radius-md)] border border-border overflow-hidden">
          {/* Table header */}
          <div className="bg-navy h-11" />

          {/* Skeleton rows */}
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-3 py-2 border-t border-border min-h-[48px]"
            >
              {/* Thumbnail */}
              <div className="w-10 h-10 rounded bg-surface animate-pulse flex-shrink-0" />
              {/* Name */}
              <div className="flex-1 h-4 bg-surface animate-pulse rounded" />
              {/* SKU */}
              <div className="w-24 h-4 bg-surface animate-pulse rounded" />
              {/* Price */}
              <div className="w-20 h-4 bg-surface animate-pulse rounded" />
              {/* Stock */}
              <div className="w-12 h-4 bg-surface animate-pulse rounded" />
              {/* Category */}
              <div className="w-24 h-4 bg-surface animate-pulse rounded" />
              {/* Status badge */}
              <div className="w-16 h-6 bg-surface animate-pulse rounded-full" />
            </div>
          ))}
        </div>
      </div>

      {/* Category sidebar skeleton */}
      <div className="ml-4 w-[240px] flex-shrink-0">
        <div className="w-[240px] bg-surface border-r border-border h-full rounded-[var(--radius-md)] p-4 flex flex-col gap-3">
          <div className="h-6 w-28 bg-bg animate-pulse rounded" />
          <div className="h-9 bg-bg animate-pulse rounded-[var(--radius-md)]" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-9 bg-bg animate-pulse rounded-[var(--radius-md)]" />
          ))}
        </div>
      </div>
    </div>
  )
}
