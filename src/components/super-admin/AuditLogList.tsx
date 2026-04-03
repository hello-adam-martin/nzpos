import { formatDistanceToNow } from 'date-fns'

interface AuditAction {
  id: string
  action: string
  note: string | null
  created_at: string
  super_admin_user_id: string
}

interface AuditLogListProps {
  actions: AuditAction[]
}

function getActionColor(action: string): string {
  switch (action) {
    case 'suspend':
      return 'bg-[var(--color-error)]/15 text-[var(--color-error)]'
    case 'unsuspend':
      return 'bg-[var(--color-success)]/15 text-[var(--color-success)]'
    case 'activate_addon':
    case 'deactivate_addon':
      return 'bg-[var(--color-amber)]/15 text-[var(--color-amber)]'
    default:
      return 'bg-[var(--color-surface)] text-[var(--color-text-muted)]'
  }
}

function getActionIcon(action: string): string {
  switch (action) {
    case 'suspend':
      return '!'
    case 'unsuspend':
      return '✓'
    case 'activate_addon':
      return '+'
    case 'deactivate_addon':
      return '−'
    default:
      return '·'
  }
}

function formatActionDescription(action: string, note: string | null): string {
  switch (action) {
    case 'suspend':
      return `Suspended — ${note ?? 'No reason given'}`
    case 'unsuspend':
      return `Unsuspended — ${note ?? 'No reason given'}`
    case 'activate_addon':
      return `Activated ${note} (manual override)`
    case 'deactivate_addon':
      return `Deactivated ${note} (manual override)`
    default:
      return `${action}${note ? ` — ${note}` : ''}`
  }
}

export default function AuditLogList({ actions }: AuditLogListProps) {
  const displayActions = actions.slice(0, 10)

  if (displayActions.length === 0) {
    return (
      <p className="text-base font-sans text-[var(--color-text-muted)]">
        No actions recorded yet.
      </p>
    )
  }

  return (
    <div className="space-y-0">
      {displayActions.map((entry) => (
        <div key={entry.id} className="flex items-start gap-3 py-2 border-b border-[var(--color-border-light)] last:border-0">
          {/* Icon circle */}
          <div
            className={[
              'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold',
              getActionColor(entry.action),
            ].join(' ')}
          >
            {getActionIcon(entry.action)}
          </div>
          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-base font-sans text-[var(--color-text)]">
              {formatActionDescription(entry.action, entry.note)}
            </p>
            <p className="text-sm font-sans text-[var(--color-text-muted)] mt-0.5">
              {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}
