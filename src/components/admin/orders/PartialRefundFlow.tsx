'use client'
import { useEffect, useRef, useState } from 'react'
import { formatNZD } from '@/lib/money'
import { processPartialRefund } from '@/actions/orders/processPartialRefund'
import { RefundItemSelector } from './RefundItemSelector'
import type { OrderItemForRefund, RefundItemSelection } from './RefundItemSelector'

type RefundStep = 'select' | 'confirm' | 'eftpos_confirm'

type RefundReason = 'customer_request' | 'damaged' | 'wrong_item' | 'other'

interface PartialRefundFlowProps {
  order: {
    id: string
    order_items: OrderItemForRefund[]
    payment_method: string | null
    channel: string
    total_cents: number
  }
  existingRefunds: Array<{
    refund_items: Array<{ order_item_id: string; quantity_refunded: number }>
  }>
  onBack: () => void
  onRefundComplete: () => void
}

export function PartialRefundFlow({
  order,
  existingRefunds,
  onBack,
  onRefundComplete,
}: PartialRefundFlowProps) {
  const [step, setStep] = useState<RefundStep>('select')
  const [selections, setSelections] = useState<RefundItemSelection[]>([])
  const [reason, setReason] = useState<RefundReason | ''>('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Build already-refunded qty map from existing refunds
  const alreadyRefundedQty = new Map<string, number>()
  for (const refund of existingRefunds) {
    for (const ri of refund.refund_items) {
      const prev = alreadyRefundedQty.get(ri.order_item_id) ?? 0
      alreadyRefundedQty.set(ri.order_item_id, prev + ri.quantity_refunded)
    }
  }

  const totalRefundCents = selections.reduce((sum, s) => sum + s.refundCents, 0)

  function getPaymentMethodMessage(): string {
    if (order.channel === 'online' || order.payment_method === 'stripe') {
      return 'Refund will be processed to the customer\'s card'
    }
    if (order.payment_method === 'cash') {
      return `Hand ${formatNZD(totalRefundCents)} cash to the customer`
    }
    if (order.payment_method === 'eftpos') {
      return `Process ${formatNZD(totalRefundCents)} refund on the EFTPOS terminal`
    }
    return `Refund ${formatNZD(totalRefundCents)} to the customer`
  }

  async function submitRefund() {
    if (!reason || selections.length === 0) return
    setIsLoading(true)
    setError(null)
    try {
      const result = await processPartialRefund({
        orderId: order.id,
        reason,
        items: selections.map((s) => ({
          orderItemId: s.orderItemId,
          quantityToRefund: s.quantityToRefund,
        })),
      })
      if ('error' in result) {
        setError(result.error)
      } else {
        onRefundComplete()
      }
    } catch {
      setError('Refund failed. Please check your connection and try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Step: select items
  if (step === 'select') {
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex-shrink-0">
          <h2 className="font-display font-bold text-xl text-text">Refund Items</h2>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          <RefundItemSelector
            items={order.order_items}
            alreadyRefundedQty={alreadyRefundedQty}
            selections={selections}
            onSelectionsChange={setSelections}
          />
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex-shrink-0 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => setStep('confirm')}
            disabled={selections.length === 0}
            className="bg-amber text-white font-bold font-sans text-sm py-3 w-full rounded-[var(--radius-lg)] hover:bg-amber-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue
          </button>
          <button
            type="button"
            onClick={onBack}
            className="bg-transparent border border-border text-navy font-bold font-sans text-sm py-3 w-full rounded-[var(--radius-lg)] hover:bg-surface transition-colors"
          >
            Back to Order
          </button>
        </div>
      </div>
    )
  }

  // Step: confirm
  if (step === 'confirm') {
    const isEftpos = order.payment_method === 'eftpos' && order.channel !== 'online'

    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex-shrink-0">
          <h2 className="font-display font-bold text-xl text-text">Confirm Refund</h2>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-5">
          {/* Selected items summary */}
          <div className="flex flex-col gap-0 rounded-[var(--radius-md)] border border-border overflow-hidden">
            {selections.map((sel) => {
              const item = order.order_items.find((i) => i.id === sel.orderItemId)
              if (!item) return null
              return (
                <div
                  key={sel.orderItemId}
                  className="flex items-center justify-between px-4 py-2.5 border-b border-border last:border-0"
                >
                  <span className="text-sm font-sans text-text flex-1 min-w-0 truncate">
                    {item.product_name}
                    <span className="text-text-muted ml-1">x{sel.quantityToRefund}</span>
                  </span>
                  <span
                    className="text-sm font-mono text-text tabular-nums flex-shrink-0 ml-3"
                    style={{ fontFeatureSettings: "'tnum' 1" }}
                  >
                    {formatNZD(sel.refundCents)}
                  </span>
                </div>
              )
            })}
            {/* Total */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-surface">
              <span className="text-sm font-bold font-sans text-text">Total</span>
              <span
                className="text-sm font-bold font-mono text-text tabular-nums"
                style={{ fontFeatureSettings: "'tnum' 1" }}
              >
                {formatNZD(totalRefundCents)}
              </span>
            </div>
          </div>

          {/* Payment method message */}
          <p className="text-sm font-sans text-text">{getPaymentMethodMessage()}</p>

          {/* Reason dropdown */}
          <div className="flex flex-col gap-2">
            <label htmlFor="refund-reason" className="text-sm font-bold font-sans text-text">
              Reason for refund
            </label>
            <select
              id="refund-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value as RefundReason | '')}
              className="w-full px-3 py-2.5 border border-border rounded-[var(--radius-md)] text-sm font-sans text-text bg-card focus:outline-none focus:ring-2 focus:ring-amber/50 focus:border-amber"
            >
              <option value="" disabled>Select a reason</option>
              <option value="customer_request">Customer request</option>
              <option value="damaged">Damaged</option>
              <option value="wrong_item">Wrong item</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Warning */}
          <p className="text-xs font-sans text-text-muted">This cannot be undone.</p>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex-shrink-0 flex flex-col gap-3">
          {error && (
            <p className="text-sm font-sans text-[var(--color-error)]">{error}</p>
          )}

          {isEftpos ? (
            <button
              type="button"
              onClick={() => {
                if (!reason) return
                setStep('eftpos_confirm')
              }}
              disabled={!reason || isLoading}
              className="bg-amber text-white font-bold font-sans text-sm py-3 w-full rounded-[var(--radius-lg)] hover:bg-amber-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue to Terminal
            </button>
          ) : (
            <button
              type="button"
              onClick={submitRefund}
              disabled={!reason || isLoading}
              className="bg-amber text-white font-bold font-sans text-sm py-3 w-full rounded-[var(--radius-lg)] hover:bg-amber-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Processing...' : 'Confirm Refund'}
            </button>
          )}

          <button
            type="button"
            onClick={() => setStep('select')}
            disabled={isLoading}
            className="bg-transparent border border-border text-navy font-bold font-sans text-sm py-3 w-full rounded-[var(--radius-lg)] hover:bg-surface transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Back
          </button>
        </div>
      </div>
    )
  }

  // Step: eftpos_confirm — full-screen navy overlay
  return (
    <EftposRefundConfirm
      totalRefundCents={totalRefundCents}
      isProcessing={isLoading}
      onConfirm={submitRefund}
      onCancel={() => setStep('confirm')}
    />
  )
}

interface EftposRefundConfirmProps {
  totalRefundCents: number
  isProcessing: boolean
  onConfirm: () => void
  onCancel: () => void
}

function EftposRefundConfirm({
  totalRefundCents,
  isProcessing,
  onConfirm,
  onCancel,
}: EftposRefundConfirmProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Focus trap on mount
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    container.focus()

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab') return
      const focusable = container!.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (!first || !last) return

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div
      ref={containerRef}
      role="alertdialog"
      aria-modal="true"
      aria-label="EFTPOS refund confirmation"
      tabIndex={-1}
      className="fixed inset-0 z-[70] bg-navy flex flex-col items-center justify-center px-4 outline-none"
    >
      {/* Amount display */}
      <div className="flex flex-col items-center mb-2">
        <p className="text-sm text-white/60 font-normal mb-1">Refund NZD</p>
        <p className="text-3xl font-display font-bold text-white tabular-nums">
          {formatNZD(totalRefundCents)}
        </p>
      </div>

      {/* Instruction */}
      <h1 className="text-xl font-bold text-white mt-8 text-center">
        Did the EFTPOS terminal approve the refund?
      </h1>
      <p className="text-sm text-white/60 mt-2 text-center">
        Check the terminal screen before confirming.
      </p>

      {/* Action buttons */}
      <div className="flex gap-4 w-full max-w-lg mt-12">
        <button
          type="button"
          onClick={isProcessing ? undefined : onConfirm}
          disabled={isProcessing}
          aria-disabled={isProcessing}
          className={[
            'flex-1 min-h-[56px] bg-success text-white text-base font-bold rounded-lg transition-opacity',
            isProcessing ? 'opacity-50 pointer-events-none' : 'hover:opacity-90',
          ].join(' ')}
        >
          YES — Refund Complete
        </button>
        <button
          type="button"
          onClick={isProcessing ? undefined : onCancel}
          disabled={isProcessing}
          aria-disabled={isProcessing}
          className={[
            'flex-1 min-h-[56px] bg-error text-white text-base font-bold rounded-lg transition-opacity',
            isProcessing ? 'opacity-50 pointer-events-none' : 'hover:opacity-90',
          ].join(' ')}
        >
          NO — Cancel Refund
        </button>
      </div>
    </div>
  )
}
