interface DashboardHeroCardProps {
  label: string
  value: string
  subLabel?: string
}

export function DashboardHeroCard({ label, value, subLabel }: DashboardHeroCardProps) {
  return (
    <div className="bg-white border border-[var(--color-border)] shadow-sm rounded-lg p-[var(--space-md)] min-h-[96px] flex flex-col justify-between">
      <p className="font-sans font-bold text-sm text-[var(--color-text-muted)]">{label}</p>
      <div>
        <p
          className="font-display font-bold text-3xl text-[var(--color-navy)]"
          style={{ fontFeatureSettings: "'tnum' 1" }}
        >
          {value}
        </p>
        {subLabel && (
          <p className="font-sans font-normal text-sm text-[var(--color-text-muted)] mt-1">
            {subLabel}
          </p>
        )}
      </div>
    </div>
  )
}
