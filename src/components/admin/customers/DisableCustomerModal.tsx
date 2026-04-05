'use client'
import { useTransition } from 'react'
import { disableCustomer } from '@/actions/customers/disableCustomer'

interface DisableCustomerModalProps {
  customerName: string
  customerId: string
  onClose: () => void
}

export default function DisableCustomerModal({
  customerName,
  customerId,
  onClose,
}: DisableCustomerModalProps) {
  const [isPending, startTransition] = useTransition()

  function handleConfirm() {
    startTransition(async () => {
      const result = await disableCustomer({ customerId })
      if ('error' in result) {
        // Error handling: keep modal open (parent can show toast if needed)
        return
      }
      onClose()
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-white rounded-lg max-w-md w-full p-[var(--space-xl)] mx-4">
        <h2 className="text-2xl font-bold font-display text-[var(--color-text)] mb-3">
          Disable {customerName}?
        </h2>
        <p className="text-sm text-[var(--color-text-muted)] font-sans mb-6">
          They won&apos;t be able to log in to the storefront.
        </p>
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isPending}
            className="w-full h-11 rounded-md bg-[var(--color-error)] text-white text-sm font-bold font-sans disabled:opacity-60 transition-opacity"
          >
            {isPending ? 'Disabling...' : 'Disable Account'}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="w-full h-11 rounded-md border border-[var(--color-border)] text-sm font-sans text-[var(--color-text)] hover:bg-[var(--color-surface)] transition-colors disabled:opacity-60"
          >
            Keep Account Active
          </button>
        </div>
      </div>
    </div>
  )
}
