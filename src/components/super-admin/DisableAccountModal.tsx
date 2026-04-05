'use client'
import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import { disableMerchantAccount } from '@/actions/super-admin/disableMerchantAccount'
import { enableMerchantAccount } from '@/actions/super-admin/enableMerchantAccount'

interface DisableAccountModalProps {
  storeId: string
  storeName: string
  ownerAuthId: string
  isOpen: boolean
  onClose: () => void
  mode: 'disable' | 'enable'
}

function ConfirmButton({ mode }: { mode: 'disable' | 'enable' }) {
  const { pending } = useFormStatus()

  if (mode === 'disable') {
    return (
      <button
        type="submit"
        disabled={pending}
        className="bg-[var(--color-error)] text-white text-sm font-semibold px-4 py-2 rounded-[var(--radius-md)] hover:bg-[var(--color-error)]/90 disabled:opacity-60 transition-colors duration-150"
      >
        {pending ? (
          <span className="flex items-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Disabling...
          </span>
        ) : (
          'Confirm Disable'
        )}
      </button>
    )
  }

  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-[var(--color-navy)] text-white text-sm font-semibold px-4 py-2 rounded-[var(--radius-md)] hover:bg-[var(--color-navy)]/90 disabled:opacity-60 transition-colors duration-150"
    >
      {pending ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Re-enabling...
        </span>
      ) : (
        'Re-enable Account'
      )}
    </button>
  )
}

export default function DisableAccountModal({
  storeId,
  storeName,
  ownerAuthId,
  isOpen,
  onClose,
  mode,
}: DisableAccountModalProps) {
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  async function handleSubmit(formData: FormData) {
    setError(null)
    const result =
      mode === 'disable'
        ? await disableMerchantAccount(formData)
        : await enableMerchantAccount(formData)

    if ('error' in result) {
      setError(
        mode === 'disable'
          ? 'Failed to disable account. Please try again.'
          : 'Failed to re-enable account. Please try again.'
      )
    } else {
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
          {mode === 'disable' ? `Disable ${storeName}?` : `Re-enable ${storeName}?`}
        </h2>

        {/* Warning / info box */}
        {mode === 'disable' ? (
          <div className="bg-[var(--color-amber)]/10 border border-[var(--color-amber)]/30 rounded-[var(--radius-md)] p-4 mb-4">
            <p className="text-sm font-sans text-[var(--color-text)]">
              This will ban the owner from logging in and suspend the store. The storefront
              and POS will become inaccessible.
            </p>
          </div>
        ) : (
          <div className="bg-[var(--color-info)]/10 border border-[var(--color-info)]/30 rounded-[var(--radius-md)] p-4 mb-4">
            <p className="text-sm font-sans text-[var(--color-text)]">
              This will restore login access and unsuspend the store.
            </p>
          </div>
        )}

        {/* Form */}
        <form action={handleSubmit}>
          <input type="hidden" name="storeId" value={storeId} />
          <input type="hidden" name="ownerAuthId" value={ownerAuthId} />

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
              {mode === 'disable' ? 'Keep Active' : 'Leave Disabled'}
            </button>
            <ConfirmButton mode={mode} />
          </div>
        </form>
      </div>
    </div>
  )
}
