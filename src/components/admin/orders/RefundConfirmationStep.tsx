'use client'
import { useState } from 'react'
import { formatNZD } from '@/lib/money'
import { processRefund } from '@/actions/orders/processRefund'

interface RefundConfirmationStepProps {
  orderId: string
  totalCents: number
  onBack: () => void
  onRefundComplete: () => void
}

export function RefundConfirmationStep({
  orderId,
  totalCents,
  onBack,
  onRefundComplete,
}: RefundConfirmationStepProps) {
  const [reason, setReason] = useState('')
  const [restoreStock, setRestoreStock] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleConfirm() {
    if (!reason) return
    setIsLoading(true)
    setError(null)
    try {
      const result = await processRefund({ orderId, reason, restoreStock })
      if ('error' in result) {
        setError(result.error)
      } else {
        onRefundComplete()
      }
    } catch {
      setError('Refund failed. Check your Stripe dashboard and try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex-shrink-0">
        <h2 className="font-sans font-bold text-xl text-text">Confirm Refund</h2>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-6">
        {/* Amount notice */}
        <p className="text-sm font-sans text-text">
          This will refund <span className="font-bold">{formatNZD(totalCents)}</span> to the customer. This cannot be undone.
        </p>

        {/* Reason select */}
        <div className="flex flex-col gap-2">
          <label htmlFor="refund-reason" className="text-sm font-bold font-sans text-text">
            Reason for refund
          </label>
          <select
            id="refund-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full px-3 py-2.5 border border-border rounded-[var(--radius-md)] text-sm font-sans text-text bg-card focus:outline-none focus:ring-2 focus:ring-amber/50 focus:border-amber"
          >
            <option value="" disabled>Select a reason</option>
            <option value="customer_request">Customer request</option>
            <option value="damaged">Damaged</option>
            <option value="wrong_item">Wrong item</option>
            <option value="other">Other</option>
          </select>
        </div>

        {/* Restock toggle */}
        <div className="flex flex-col gap-1.5">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={restoreStock}
              onChange={(e) => setRestoreStock(e.target.checked)}
              className="w-4 h-4 rounded border-border text-amber accent-amber cursor-pointer"
            />
            <span className="text-sm font-bold font-sans text-text">Restock items?</span>
          </label>
          <p className="text-xs font-sans text-text-muted pl-7">
            Add these items back to stock if they are in a sellable condition.
          </p>
        </div>
      </div>

      {/* Footer: actions */}
      <div className="px-6 py-4 border-t border-border flex-shrink-0 flex flex-col gap-3">
        {/* Inline error */}
        {error && (
          <p className="text-sm font-sans text-[var(--color-error)]">{error}</p>
        )}

        {/* Confirm button */}
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!reason || isLoading}
          className="bg-amber text-white font-bold font-sans text-sm py-3 w-full rounded-[var(--radius-lg)] hover:bg-amber-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Processing...' : 'Confirm Refund'}
        </button>

        {/* Back button */}
        <button
          type="button"
          onClick={onBack}
          disabled={isLoading}
          className="bg-transparent border border-border text-navy font-bold font-sans text-sm py-3 w-full rounded-[var(--radius-lg)] hover:bg-surface transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Back to Order
        </button>
      </div>
    </div>
  )
}
