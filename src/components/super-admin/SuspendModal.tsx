'use client'
import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import { suspendTenant } from '@/actions/super-admin/suspendTenant'

interface SuspendModalProps {
  storeId: string
  storeName: string
  isOpen: boolean
  onClose: () => void
}

function ConfirmButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="bg-[var(--color-error)] text-white text-sm font-semibold px-4 py-2 rounded-[var(--radius-md)] hover:bg-[var(--color-error)]/90 disabled:opacity-60 transition-colors duration-150"
    >
      {pending ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Suspending...
        </span>
      ) : (
        'Confirm Suspension'
      )}
    </button>
  )
}

export default function SuspendModal({ storeId, storeName, isOpen, onClose }: SuspendModalProps) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  async function handleSubmit(formData: FormData) {
    setError(null)
    const result = await suspendTenant(formData)
    if ('error' in result) {
      setError('Failed to suspend store. Please try again.')
    } else {
      setReason('')
      onClose()
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center transition-opacity duration-250 ease-out"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[var(--radius-lg)] shadow-lg p-6 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title */}
        <h2 className="font-display text-xl font-semibold text-[var(--color-text)] mb-4">
          Suspend {storeName}?
        </h2>

        {/* Warning box */}
        <div className="bg-[var(--color-amber)]/10 border border-[var(--color-amber)]/30 rounded-[var(--radius-md)] p-4 mb-4">
          <p className="text-sm font-sans text-[var(--color-text)]">
            This store&apos;s storefront and admin dashboard will be immediately inaccessible to the owner and their customers.
          </p>
        </div>

        {/* Form */}
        <form action={handleSubmit}>
          <input type="hidden" name="storeId" value={storeId} />

          <div className="mb-4">
            <label
              htmlFor="suspend-reason"
              className="block text-sm font-semibold font-sans text-[var(--color-text)] mb-1"
            >
              Reason for suspension
            </label>
            <textarea
              id="suspend-reason"
              name="reason"
              required
              minLength={1}
              maxLength={500}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Billing dispute, Terms of Service violation..."
              rows={3}
              className="w-full text-sm font-sans border border-[var(--color-border)] rounded-[var(--radius-md)] px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[var(--color-navy)] resize-none"
            />
          </div>

          {error && (
            <p className="mb-3 text-sm font-sans text-[var(--color-error)]">{error}</p>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="text-sm font-semibold font-sans text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors duration-150"
            >
              Cancel
            </button>
            <ConfirmButton disabled={reason.trim().length === 0} />
          </div>
        </form>
      </div>
    </div>
  )
}
