interface StaffStatusBadgeProps {
  isActive: boolean
}

export default function StaffStatusBadge({ isActive }: StaffStatusBadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-full text-xs font-semibold font-sans px-2 py-1',
        isActive
          ? 'bg-success/10 text-success border border-success/20'
          : 'bg-surface text-text-muted border border-border',
      ].join(' ')}
    >
      {isActive ? 'Active' : 'Inactive'}
    </span>
  )
}
