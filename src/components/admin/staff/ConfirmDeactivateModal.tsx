'use client'

interface ConfirmDeactivateModalProps {
  staffName: string
  isPending: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDeactivateModal({
  staffName,
  isPending,
  onConfirm,
  onCancel,
}: ConfirmDeactivateModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div
        className="bg-card rounded-[var(--radius-lg)] shadow-lg w-full max-w-[400px] overflow-hidden"
        style={{ animation: 'modalOpen 250ms ease-out' }}
      >
        {/* Header — no close X, must choose action */}
        <div className="px-6 pt-6 pb-0">
          <h2 className="text-xl font-semibold font-sans text-text">
            Deactivate {staffName}?
          </h2>
        </div>

        {/* Body */}
        <div className="px-6 py-6 flex flex-col gap-4">
          <p className="text-sm font-sans text-text">
            They&apos;ll be immediately logged out and won&apos;t be able to use the POS.
          </p>

          {/* Warning block */}
          <div className="bg-error/10 border border-error/20 rounded-[var(--radius-md)] p-3 flex items-start gap-2">
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              className="flex-shrink-0 mt-0.5 text-error"
            >
              <path
                d="M8 1.5L1 13.5h14L8 1.5z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              <path d="M8 6v3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="8" cy="11.5" r="0.5" fill="currentColor" stroke="currentColor" strokeWidth="0.5" />
            </svg>
            <p className="text-xs font-sans text-error">
              This can be reversed — reactivate them from the staff list at any time.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="flex-1 h-11 border border-navy text-navy text-sm font-semibold font-sans rounded-[var(--radius-md)] hover:bg-navy/5 transition-colors disabled:opacity-40"
          >
            Keep Active
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="flex-1 h-11 bg-error text-white text-sm font-semibold font-sans rounded-[var(--radius-md)] hover:bg-error/90 transition-colors disabled:opacity-40"
          >
            {isPending ? 'Deactivating…' : 'Deactivate'}
          </button>
        </div>
      </div>
    </div>
  )
}
