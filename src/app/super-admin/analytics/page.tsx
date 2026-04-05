export const dynamic = 'force-dynamic'

export default function AnalyticsPage() {
  return (
    <div>
      <h1 className="font-display text-xl font-semibold text-[var(--color-text)] mb-6">
        Analytics
      </h1>
      <div className="bg-white border border-[var(--color-border)] shadow-sm rounded-lg p-8 text-center">
        <p className="text-sm font-sans text-[var(--color-text-muted)]">
          Platform analytics are coming in Phase 27. MRR, churn, and revenue breakdown will appear here.
        </p>
      </div>
    </div>
  )
}
