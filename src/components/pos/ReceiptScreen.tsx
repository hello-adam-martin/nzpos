'use client'

import { useState } from 'react'
import Link from 'next/link'
import { CheckCircle } from 'lucide-react'
import type { ReceiptData } from '@/lib/receipt'
import { formatNZD } from '@/lib/money'

type ReceiptScreenProps = {
  receiptData: ReceiptData | null | undefined
  onNewSale?: () => void
  onEmailCapture?: (email: string) => void
  mode?: 'pos' | 'admin'
  demoMode?: boolean
}

function paymentLabel(method: string): string {
  if (method === 'eftpos') return 'EFTPOS'
  if (method === 'cash') return 'Cash'
  if (method === 'split') return 'Split (Cash + EFTPOS)'
  return method.toUpperCase()
}

export function ReceiptScreen({
  receiptData,
  onNewSale,
  onEmailCapture,
  mode = 'pos',
  demoMode = false,
}: ReceiptScreenProps) {
  const [emailInput, setEmailInput] = useState('')
  const [emailSent, setEmailSent] = useState(false)

  // Handle null/undefined receipt data (old orders before receipt tracking)
  if (!receiptData) {
    return (
      <div className="flex items-center justify-center p-8 text-center">
        <p className="text-sm text-text-muted">
          Receipt not available for orders placed before receipt tracking was enabled.
        </p>
      </div>
    )
  }

  function handleEmailBlur() {
    if (emailInput && emailInput.includes('@') && onEmailCapture && !emailSent) {
      onEmailCapture(emailInput)
      setEmailSent(true)
    }
  }

  function handleEmailKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      handleEmailBlur()
    }
  }

  const cardContent = (
    <div className="bg-card rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex flex-col items-center py-8 px-4 border-b border-border">
        <CheckCircle size={48} className="text-success mb-3" />
        <h1 className="text-xl font-bold text-text text-center" style={{ fontFamily: 'var(--font-sans)', fontWeight: 700 }}>
          {receiptData.storeName || 'Sale Complete'}
        </h1>
        <p className="text-sm font-medium text-text-muted mt-1">Sale Complete</p>
        <p className="text-sm font-mono text-text-muted mt-1">
          Order #{receiptData.orderId.slice(0, 8).toUpperCase()}
        </p>
      </div>

      {/* Items list (scrollable) */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3">
        <h2 className="text-sm font-bold text-text-muted uppercase tracking-wide mb-2">Items</h2>
        <div className="space-y-1">
          {receiptData.items.map((item, idx) => (
            <div
              key={`${item.productId}-${idx}`}
              className="flex items-center justify-between py-2 border-b border-border-light"
            >
              <div className="flex-1 min-w-0">
                <p className="text-base font-medium text-text truncate">{item.productName}</p>
                <p className="text-sm text-text-muted">
                  {item.quantity} &times; {formatNZD(item.unitPriceCents)}
                </p>
                {item.discountCents > 0 && (
                  <p className="text-sm text-text-muted">
                    -{formatNZD(item.discountCents)} off
                  </p>
                )}
              </div>
              <div className="ml-3 text-right">
                <span className="text-base font-bold text-text tabular-nums">
                  {formatNZD(item.lineTotalCents)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Totals section */}
      <div className="px-4 py-4 border-t border-border space-y-2">
        {/* Subtotal */}
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-text-muted">Subtotal</span>
          <span className="text-sm tabular-nums text-text">{formatNZD(receiptData.subtotalCents)}</span>
        </div>

        {/* GST */}
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-text-muted">GST (15% incl.)</span>
          <span className="text-sm tabular-nums text-text-muted">{formatNZD(receiptData.gstCents)}</span>
        </div>

        {/* Total */}
        <div className="flex justify-between items-center pt-1 border-t border-border">
          <span className="text-xl font-bold text-text">Total</span>
          <span className="text-[1.875rem] font-display font-bold text-text tabular-nums">
            {formatNZD(receiptData.totalCents)}
          </span>
        </div>

        {/* Payment badge */}
        <div className="flex justify-between items-center pt-1">
          <span className="text-sm text-text-muted">Payment</span>
          <span className="inline-flex items-center px-2 py-1 rounded text-sm font-bold bg-navy/10 text-navy">
            {paymentLabel(receiptData.paymentMethod)}
          </span>
        </div>

        {/* Tendered */}
        {receiptData.cashTenderedCents != null && receiptData.cashTenderedCents > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-text-muted">Tendered</span>
            <span className="text-sm tabular-nums text-text">{formatNZD(receiptData.cashTenderedCents)}</span>
          </div>
        )}

        {/* Change */}
        {receiptData.changeDueCents != null && receiptData.changeDueCents > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-sm font-bold text-text">Change</span>
            <span className="text-base font-bold text-success tabular-nums">
              {formatNZD(receiptData.changeDueCents)}
            </span>
          </div>
        )}
      </div>

      {/* Store info footer */}
      {(receiptData.storeAddress || receiptData.storePhone || receiptData.gstNumber) && (
        <div className="px-4 pb-3 text-center border-t border-border-light pt-3">
          {receiptData.storeAddress && (
            <p className="text-sm text-text-muted">{receiptData.storeAddress}</p>
          )}
          {receiptData.storePhone && (
            <p className="text-sm text-text-muted">{receiptData.storePhone}</p>
          )}
          {receiptData.gstNumber && (
            <p className="text-sm text-text-muted">GST No: {receiptData.gstNumber}</p>
          )}
        </div>
      )}

      {/* Demo signup CTA — per D-01: inline banner, per D-03: demoMode only */}
      {demoMode && (
        <div className="px-4 pb-4 pt-4 border-t border-border-light">
          <p className="text-sm font-bold text-text text-center">
            Ready to set up your own store?
          </p>
          <p className="text-xs text-text-muted text-center mt-1">
            Get your POS and online store live in minutes.
          </p>
          <Link
            href="/signup"
            className="mt-3 w-full min-h-[44px] inline-flex items-center justify-center bg-[var(--color-navy)] text-white text-sm font-bold rounded-lg hover:opacity-90 transition-opacity duration-150"
          >
            Create your free store
          </Link>
          {onNewSale && (
            <button
              onClick={onNewSale}
              className="w-full text-sm text-text-muted mt-2 hover:text-text transition-colors duration-150"
              type="button"
            >
              or start a new sale
            </button>
          )}
        </div>
      )}

      {/* Email capture (POS mode only) */}
      {mode === 'pos' && onEmailCapture && (
        <div className="px-4 pb-3">
          <input
            type="email"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            onBlur={handleEmailBlur}
            onKeyDown={handleEmailKeyDown}
            placeholder="Customer email (optional)"
            disabled={emailSent}
            className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-surface text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-navy/30 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Customer email address"
          />
          {emailSent && (
            <p className="text-xs text-success mt-1">Email saved.</p>
          )}
        </div>
      )}

      {/* New Sale CTA (only when onNewSale provided) */}
      {onNewSale && (
        <div className="px-4 pb-6">
          <button
            onClick={onNewSale}
            className="w-full min-h-[56px] bg-amber text-white text-base font-bold rounded-lg hover:opacity-90 transition-opacity"
          >
            New Sale
          </button>
        </div>
      )}
    </div>
  )

  // POS mode: fixed overlay
  if (mode === 'pos') {
    return (
      <div
        className="fixed inset-0 z-50 bg-navy-dark/80 flex items-center justify-center animate-[fadeIn_150ms_ease-out]"
        role="dialog"
        aria-modal="true"
        aria-label="Sale complete — receipt"
      >
        {cardContent}
      </div>
    )
  }

  // Admin mode: no overlay wrapper (renders inside drawer/modal)
  return cardContent
}
