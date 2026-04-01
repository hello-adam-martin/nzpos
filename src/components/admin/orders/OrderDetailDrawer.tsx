'use client'
import { useEffect, useState } from 'react'
import { formatNZD } from '@/lib/money'
import { OrderStatusBadge } from './OrderStatusBadge'
import { updateOrderStatus } from '@/actions/orders/updateOrderStatus'
import type { OrderWithStaff } from './OrderDataTable'

const NZ_DATE_FORMAT = new Intl.DateTimeFormat('en-NZ', {
  dateStyle: 'long',
  timeStyle: 'short',
})

const REFUNDABLE_STATUSES = new Set([
  'completed',
  'pending_pickup',
  'ready',
  'collected',
])

const CLICK_COLLECT_STATUSES = new Set([
  'pending_pickup',
  'ready',
  'collected',
])

interface OrderDetailDrawerProps {
  order: OrderWithStaff | null
  onClose: () => void
  onRefundClick: () => void
}

export function OrderDetailDrawer({ order, onClose, onRefundClick }: OrderDetailDrawerProps) {
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [transitionError, setTransitionError] = useState<string | null>(null)

  // Escape key handler
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    if (order) {
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [order, onClose])

  // Reset error when order changes
  useEffect(() => {
    setTransitionError(null)
  }, [order?.id])

  async function handleStatusTransition(newStatus: string) {
    if (!order) return
    setIsTransitioning(true)
    setTransitionError(null)
    try {
      const result = await updateOrderStatus({ orderId: order.id, newStatus })
      if ('error' in result) {
        setTransitionError(result.error)
      }
    } catch {
      setTransitionError('Failed to update status. Please try again.')
    } finally {
      setIsTransitioning(false)
    }
  }

  const isOpen = order !== null

  return (
    <>
      {/* Overlay */}
      <div
        className={[
          'fixed inset-0 bg-black/40 z-40 transition-opacity duration-200',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        ].join(' ')}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        className={[
          'fixed right-0 top-0 h-full bg-card z-50 overflow-y-auto shadow-xl',
          'w-full sm:w-[480px]',
          'transition-transform ease-out duration-[250ms]',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
        role="dialog"
        aria-modal="true"
        aria-label="Order detail"
      >
        {order && (
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-start justify-between px-6 py-4 border-b border-border flex-shrink-0 gap-3">
              <div className="flex flex-col gap-1 min-w-0">
                <p className="text-xs font-sans text-text-muted">Order ID</p>
                <p className="text-sm font-mono text-text break-all">{order.id}</p>
                <p className="text-xs font-sans text-text-muted mt-1">
                  {NZ_DATE_FORMAT.format(new Date(order.created_at))}
                </p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <OrderStatusBadge status={order.status as Parameters<typeof OrderStatusBadge>[0]['status']} />
                <button
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-md)] text-text-muted hover:text-text hover:bg-surface transition-colors"
                  aria-label="Close drawer"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-6">

              {/* Line items table */}
              <section>
                <h3 className="text-sm font-bold font-sans text-text mb-3">Line Items</h3>
                <div className="overflow-x-auto rounded-[var(--radius-md)] border border-border">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-surface border-b border-border">
                        <th className="px-3 py-2 text-left text-xs font-bold font-sans text-text-muted">Product</th>
                        <th className="px-3 py-2 text-right text-xs font-bold font-sans text-text-muted">Qty</th>
                        <th className="px-3 py-2 text-right text-xs font-bold font-sans text-text-muted">Unit Price</th>
                        <th className="px-3 py-2 text-right text-xs font-bold font-sans text-text-muted">Discount</th>
                        <th className="px-3 py-2 text-right text-xs font-bold font-sans text-text-muted">Line Total</th>
                        <th className="px-3 py-2 text-right text-xs font-bold font-sans text-text-muted">GST</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.order_items.map((item) => (
                        <tr key={item.id} className="border-b border-border last:border-0">
                          <td className="px-3 py-2 font-sans text-text">{item.product_name}</td>
                          <td className="px-3 py-2 text-right font-mono text-text">{item.quantity}</td>
                          <td className="px-3 py-2 text-right font-mono text-text" style={{ fontFeatureSettings: "'tnum' 1" }}>
                            {formatNZD(item.unit_price_cents)}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-text-muted" style={{ fontFeatureSettings: "'tnum' 1" }}>
                            {item.discount_cents > 0 ? `-${formatNZD(item.discount_cents)}` : '—'}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-text" style={{ fontFeatureSettings: "'tnum' 1" }}>
                            {formatNZD(item.line_total_cents)}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-text-muted" style={{ fontFeatureSettings: "'tnum' 1" }}>
                            {formatNZD(item.gst_cents)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Summary row */}
                <div className="mt-3 border border-border rounded-[var(--radius-md)] divide-y divide-border">
                  <div className="flex items-center justify-between px-4 py-2">
                    <span className="text-sm font-sans text-text-muted">Subtotal</span>
                    <span className="text-sm font-mono text-text" style={{ fontFeatureSettings: "'tnum' 1" }}>
                      {formatNZD(order.subtotal_cents)}
                    </span>
                  </div>
                  {order.discount_cents > 0 && (
                    <div className="flex items-center justify-between px-4 py-2">
                      <span className="text-sm font-sans text-text-muted">Discount</span>
                      <span className="text-sm font-mono text-[var(--color-success)]" style={{ fontFeatureSettings: "'tnum' 1" }}>
                        -{formatNZD(order.discount_cents)}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between px-4 py-2">
                    <span className="text-sm font-sans text-text-muted">GST (15%)</span>
                    <span className="text-sm font-mono text-text-muted" style={{ fontFeatureSettings: "'tnum' 1" }}>
                      {formatNZD(order.gst_cents)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-2 bg-surface rounded-b-[var(--radius-md)]">
                    <span className="text-sm font-bold font-sans text-text">Total</span>
                    <span className="text-sm font-bold font-mono text-text" style={{ fontFeatureSettings: "'tnum' 1" }}>
                      {formatNZD(order.total_cents)}
                    </span>
                  </div>
                </div>
              </section>

              {/* Payment info */}
              <section>
                <h3 className="text-sm font-bold font-sans text-text mb-3">Payment</h3>
                <div className="border border-border rounded-[var(--radius-md)] divide-y divide-border">
                  <div className="flex items-center justify-between px-4 py-2">
                    <span className="text-sm font-sans text-text-muted">Method</span>
                    <span className="text-sm font-sans text-text capitalize">
                      {order.payment_method ?? '—'}
                    </span>
                  </div>
                  {order.customer_email && (
                    <div className="flex items-center justify-between px-4 py-2">
                      <span className="text-sm font-sans text-text-muted">Customer Email</span>
                      <span className="text-sm font-sans text-text">{order.customer_email}</span>
                    </div>
                  )}
                  {order.stripe_payment_intent_id && (
                    <div className="flex items-center justify-between px-4 py-2 gap-3">
                      <span className="text-sm font-sans text-text-muted flex-shrink-0">Stripe PI</span>
                      <span className="text-sm font-mono text-text truncate" title={order.stripe_payment_intent_id}>
                        {order.stripe_payment_intent_id.slice(0, 24)}…
                      </span>
                    </div>
                  )}
                </div>
              </section>

              {/* Click-and-collect status transitions */}
              {CLICK_COLLECT_STATUSES.has(order.status) && (
                <section>
                  <h3 className="text-sm font-bold font-sans text-text mb-3">Click &amp; Collect</h3>
                  {transitionError && (
                    <p className="text-sm font-sans text-[var(--color-error)] mb-3">{transitionError}</p>
                  )}
                  <div className="flex flex-col gap-2">
                    {order.status === 'pending_pickup' && (
                      <button
                        type="button"
                        onClick={() => handleStatusTransition('ready')}
                        disabled={isTransitioning}
                        className="w-full py-2.5 px-4 bg-navy text-white text-sm font-bold font-sans rounded-[var(--radius-md)] hover:bg-navy-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isTransitioning ? 'Updating...' : 'Mark Ready'}
                      </button>
                    )}
                    {order.status === 'ready' && (
                      <button
                        type="button"
                        onClick={() => handleStatusTransition('collected')}
                        disabled={isTransitioning}
                        className="w-full py-2.5 px-4 bg-navy text-white text-sm font-bold font-sans rounded-[var(--radius-md)] hover:bg-navy-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isTransitioning ? 'Updating...' : 'Mark Collected'}
                      </button>
                    )}
                    {order.status === 'collected' && (
                      <p className="text-sm font-sans text-text-muted">
                        Order has been collected. No further actions available.
                      </p>
                    )}
                  </div>
                </section>
              )}

              {/* Notes */}
              {order.notes && (
                <section>
                  <h3 className="text-sm font-bold font-sans text-text mb-2">Notes</h3>
                  <p className="text-sm font-sans text-text-muted whitespace-pre-wrap">{order.notes}</p>
                </section>
              )}

            </div>

            {/* Footer: Refund button */}
            {REFUNDABLE_STATUSES.has(order.status) && (
              <div className="px-6 py-4 border-t border-border flex-shrink-0">
                <button
                  type="button"
                  onClick={onRefundClick}
                  className="bg-navy text-white w-full py-3 rounded-[var(--radius-lg)] font-bold font-sans text-sm hover:bg-navy-dark transition-colors"
                >
                  Refund Order
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
