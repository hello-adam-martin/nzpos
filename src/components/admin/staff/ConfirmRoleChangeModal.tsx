'use client'
import RoleBadge from './RoleBadge'

interface ConfirmRoleChangeModalProps {
  staffName: string
  currentRole: string
  newRole: string
  isPending: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmRoleChangeModal({
  staffName,
  currentRole,
  newRole,
  isPending,
  onConfirm,
  onCancel,
}: ConfirmRoleChangeModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div
        className="bg-card rounded-[var(--radius-lg)] shadow-lg w-full max-w-[400px] overflow-hidden"
        style={{ animation: 'modalOpen 250ms ease-out' }}
      >
        {/* Header — no close X, must choose action */}
        <div className="px-6 pt-6 pb-0">
          <h2 className="text-xl font-semibold font-sans text-text">Change role?</h2>
        </div>

        {/* Body */}
        <div className="px-6 py-6">
          <p className="text-sm font-sans text-text">
            Change {staffName} from{' '}
            <RoleBadge role={currentRole} />{' '}
            to{' '}
            <RoleBadge role={newRole} />
            ? They&apos;ll be logged out and need to re-enter their PIN.
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="flex-1 h-11 border border-navy text-navy text-sm font-semibold font-sans rounded-[var(--radius-md)] hover:bg-navy/5 transition-colors disabled:opacity-40"
          >
            Keep Current Role
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="flex-1 h-11 bg-navy text-white text-sm font-semibold font-sans rounded-[var(--radius-md)] hover:bg-navy/90 transition-colors disabled:opacity-40"
          >
            {isPending ? 'Changing…' : 'Change Role'}
          </button>
        </div>
      </div>
    </div>
  )
}
