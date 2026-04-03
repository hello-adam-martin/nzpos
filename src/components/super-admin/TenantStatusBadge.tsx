interface TenantStatusBadgeProps {
  isActive: boolean
}

export default function TenantStatusBadge({ isActive }: TenantStatusBadgeProps) {
  if (isActive) {
    return (
      <span className="bg-[var(--color-success)] text-white text-sm font-semibold font-sans px-2 py-0.5 rounded-full">
        Active
      </span>
    )
  }
  return (
    <span className="bg-[var(--color-error)] text-white text-sm font-semibold font-sans px-2 py-0.5 rounded-full">
      Suspended
    </span>
  )
}
