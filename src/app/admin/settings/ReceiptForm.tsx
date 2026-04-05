'use client'

import { useState, useTransition } from 'react'
import { updateReceiptSettings } from '@/actions/settings/updateReceiptSettings'

interface Props {
  receiptHeader: string
  receiptFooter: string
}

/**
 * ReceiptForm — settings section for receipt header and footer customization.
 */
export function ReceiptForm({ receiptHeader, receiptFooter }: Props) {
  const [header, setHeader] = useState(receiptHeader)
  const [footer, setFooter] = useState(receiptFooter)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSave = () => {
    setSuccess(false)
    setError(null)
    startTransition(async () => {
      const result = await updateReceiptSettings({
        receipt_header: header,
        receipt_footer: footer,
      })
      if ('error' in result) {
        setError(result.error)
      } else {
        setSuccess(true)
      }
    })
  }

  return (
    <div className="max-w-md w-full bg-card border border-[var(--color-border)] shadow-sm rounded-[var(--radius-lg)] p-[var(--space-xl)]">
      <h2 className="text-base font-bold font-sans text-[var(--color-text)] mb-[var(--space-lg)]">
        Receipt Customisation
      </h2>

      {/* Receipt Header */}
      <div className="mb-[var(--space-md)]">
        <label
          htmlFor="receipt-header"
          className="block font-sans text-sm font-normal text-[var(--color-text)] mb-[var(--space-xs)]"
        >
          Receipt Header
        </label>
        <textarea
          id="receipt-header"
          value={header}
          onChange={(e) => setHeader(e.target.value)}
          maxLength={500}
          placeholder="e.g. Thanks for shopping with us!"
          rows={3}
          className="w-full min-h-[80px] px-3 py-2 rounded-md border border-[var(--color-border)] bg-white text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-light)] focus:outline-none focus:ring-2 focus:ring-[var(--color-navy)]/20 focus:border-[var(--color-navy)]/40 transition-colors duration-150 resize-y"
        />
      </div>

      {/* Receipt Footer */}
      <div className="mb-[var(--space-md)]">
        <label
          htmlFor="receipt-footer"
          className="block font-sans text-sm font-normal text-[var(--color-text)] mb-[var(--space-xs)]"
        >
          Receipt Footer
        </label>
        <textarea
          id="receipt-footer"
          value={footer}
          onChange={(e) => setFooter(e.target.value)}
          maxLength={500}
          placeholder="e.g. Returns accepted within 7 days with receipt."
          rows={3}
          className="w-full min-h-[80px] px-3 py-2 rounded-md border border-[var(--color-border)] bg-white text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-light)] focus:outline-none focus:ring-2 focus:ring-[var(--color-navy)]/20 focus:border-[var(--color-navy)]/40 transition-colors duration-150 resize-y"
        />
      </div>

      {/* Error message */}
      {error && (
        <p className="mb-[var(--space-sm)] font-sans text-sm text-[var(--color-error)]" role="alert">
          {error}
        </p>
      )}

      {/* Success message */}
      {success && (
        <p className="mb-[var(--space-sm)] font-sans text-sm text-[var(--color-success)]" role="status">
          Settings saved.
        </p>
      )}

      {/* Save button */}
      <button
        type="button"
        onClick={handleSave}
        disabled={isPending}
        className="w-full min-h-[44px] rounded-md bg-[var(--color-amber)] text-white font-sans font-bold text-sm transition-colors duration-150 hover:bg-[var(--color-accent-hover)] disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isPending ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  )
}
