interface AddonStatusBadgeProps {
  isActive: boolean
  isManualOverride: boolean
}

export default function AddonStatusBadge({ isActive, isManualOverride }: AddonStatusBadgeProps) {
  if (isActive && !isManualOverride) {
    return (
      <span className="bg-[var(--color-navy)] text-white text-sm font-semibold font-sans px-2 py-0.5 rounded-full">
        Active (Stripe)
      </span>
    )
  }
  if (isActive && isManualOverride) {
    return (
      <span className="bg-[var(--color-amber)]/15 text-[var(--color-amber)] text-sm font-semibold font-sans px-2 py-0.5 rounded-full">
        Active (Manual)
      </span>
    )
  }
  return (
    <span className="bg-[var(--color-surface)] text-[var(--color-text-muted)] text-sm font-sans px-2 py-0.5 rounded-full">
      Inactive
    </span>
  )
}
