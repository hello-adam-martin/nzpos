interface RoleBadgeProps {
  role: string
}

export default function RoleBadge({ role }: RoleBadgeProps) {
  const roleStyles: Record<string, string> = {
    owner: 'bg-navy/10 text-navy',
    manager: 'bg-amber/10 text-amber',
    staff: 'bg-surface text-text-muted border border-border',
  }

  const styles = roleStyles[role] ?? 'bg-surface text-text-muted border border-border'
  const label = role.charAt(0).toUpperCase() + role.slice(1)

  return (
    <span
      className={[
        'inline-flex items-center rounded-full text-xs font-semibold font-sans px-2 py-1',
        styles,
      ].join(' ')}
    >
      {label}
    </span>
  )
}
