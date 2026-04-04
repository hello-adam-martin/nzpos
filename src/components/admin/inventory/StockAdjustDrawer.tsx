'use client'

import { useEffect, useRef, useState } from 'react'
import { adjustStock } from '@/actions/inventory/adjustStock'
import { MANUAL_REASON_CODES, REASON_CODE_LABELS } from '@/schemas/inventory'

interface StockAdjustDrawerProps {
  product: {
    id: string
    name: string
    stock_quantity: number
  }
  onClose: () => void
  onSuccess: (newQuantity: number) => void
}

type AdjustMode = 'delta' | 'absolute'

export function StockAdjustDrawer({ product, onClose, onSuccess }: StockAdjustDrawerProps) {
  const [mode, setMode] = useState<AdjustMode>('delta')
  const [value, setValue] = useState(0)
  const [reason, setReason] = useState<(typeof MANUAL_REASON_CODES)[number]>(MANUAL_REASON_CODES[0])
  const [notes, setNotes] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  const isDirty = value !== 0 || notes !== ''

  // Animate in on mount
  useEffect(() => {
    const raf = requestAnimationFrame(() => setIsVisible(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  // Escape key handler
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        handleClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  })

  function handleClose() {
    if (isDirty) {
      if (!confirm('You have unsaved changes. Close without saving?')) return
    }
    setIsVisible(false)
    setTimeout(onClose, 250)
  }

  function computeNewStock(): number {
    if (mode === 'delta') {
      return product.stock_quantity + value
    }
    return value
  }

  function computeDelta(): number {
    if (mode === 'delta') return value
    return value - product.stock_quantity
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const delta = computeDelta()

    setIsSaving(true)
    const result = await adjustStock({
      product_id: product.id,
      quantity_delta: delta,
      reason,
      notes: notes.trim() || undefined,
    })
    setIsSaving(false)

    if ('error' in result) {
      if (result.error === 'validation_failed') {
        setError('Please check your input and try again.')
      } else if (result.error === 'feature_not_active') {
        setError('Inventory add-on is not active for your store.')
      } else if (result.error === 'product_not_found') {
        setError('Product not found. It may have been deactivated.')
      } else {
        setError('Adjustment failed. Your stock has not changed. Try again or reload the page.')
      }
      return
    }

    onSuccess(result.new_quantity)
  }

  const newStock = computeNewStock()
  const isStockNegative = newStock < 0

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-navy/40 z-40"
        onClick={handleClose}
        aria-hidden="true"
        style={{
          opacity: isVisible ? 1 : 0,
          transition: 'opacity 250ms ease-out',
        }}
      />

      {/* Drawer */}
      <div
        className="fixed inset-y-0 right-0 w-full sm:w-[480px] bg-card z-50 flex flex-col shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="adjust-drawer-title"
        style={{
          transform: isVisible ? 'translateX(0)' : 'translateX(100%)',
          transition: `transform 250ms ${isVisible ? 'ease-out' : 'ease-in'}`,
        }}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-border flex-shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <h2
                id="adjust-drawer-title"
                className="text-xl font-bold font-display text-text"
              >
                {product.name}
              </h2>
              <p
                className="text-sm font-mono text-muted mt-0.5"
                style={{ fontFeatureSettings: "'tnum' 1" }}
              >
                Current stock: {product.stock_quantity}
              </p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-md)] text-muted hover:text-text hover:bg-surface transition-colors"
              aria-label="Close drawer"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-5">

          {/* Mode toggle — Adjust by / Set to */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-bold font-body text-text">Adjustment type</label>
            <div className="inline-flex rounded-full border border-border overflow-hidden self-start">
              <button
                type="button"
                onClick={() => { setMode('delta'); setValue(0) }}
                className={[
                  'px-4 py-2 text-sm font-bold font-body transition-colors',
                  mode === 'delta'
                    ? 'bg-navy text-white'
                    : 'bg-surface text-text border-r border-border hover:bg-border/50',
                ].join(' ')}
              >
                Adjust by
              </button>
              <button
                type="button"
                onClick={() => { setMode('absolute'); setValue(product.stock_quantity) }}
                className={[
                  'px-4 py-2 text-sm font-bold font-body transition-colors',
                  mode === 'absolute'
                    ? 'bg-navy text-white'
                    : 'bg-surface text-text hover:bg-border/50',
                ].join(' ')}
              >
                Set to
              </button>
            </div>
          </div>

          {/* Quantity input */}
          <div className="flex flex-col gap-2">
            <label htmlFor="adjust-quantity" className="text-sm font-bold font-body text-text">
              {mode === 'delta' ? 'Quantity (positive to add, negative to remove)' : 'New quantity'}
            </label>
            {mode === 'delta' ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setValue(v => v - 1)}
                  className="w-11 h-11 flex items-center justify-center bg-surface hover:bg-border rounded-[var(--radius-md)] border border-border text-text font-bold text-lg transition-colors"
                  aria-label="Decrease"
                >
                  −
                </button>
                <input
                  id="adjust-quantity"
                  type="number"
                  value={value}
                  onChange={(e) => setValue(parseInt(e.target.value) || 0)}
                  className="w-24 h-12 text-center font-mono text-base border border-border rounded-[var(--radius-md)] bg-card text-text focus:outline-none focus:ring-2 focus:ring-navy focus:border-navy"
                  style={{ fontFeatureSettings: "'tnum' 1" }}
                />
                <button
                  type="button"
                  onClick={() => setValue(v => v + 1)}
                  className="w-11 h-11 flex items-center justify-center bg-surface hover:bg-border rounded-[var(--radius-md)] border border-border text-text font-bold text-lg transition-colors"
                  aria-label="Increase"
                >
                  +
                </button>
              </div>
            ) : (
              <input
                id="adjust-quantity"
                type="number"
                min={0}
                value={value}
                onChange={(e) => setValue(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-32 h-12 text-center font-mono text-base border border-border rounded-[var(--radius-md)] bg-card text-text focus:outline-none focus:ring-2 focus:ring-navy focus:border-navy"
                style={{ fontFeatureSettings: "'tnum' 1" }}
              />
            )}

            {/* Preview */}
            <p
              className={[
                'text-sm font-mono font-bold',
                isStockNegative ? 'text-error' : 'text-text',
              ].join(' ')}
              style={{ fontFeatureSettings: "'tnum' 1" }}
            >
              New stock: {newStock}
              {isStockNegative && ' (cannot go below zero)'}
            </p>
          </div>

          {/* Reason code */}
          <div className="flex flex-col gap-2">
            <label htmlFor="adjust-reason" className="text-sm font-bold font-body text-text">
              Reason
            </label>
            <select
              id="adjust-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value as (typeof MANUAL_REASON_CODES)[number])}
              className="w-full px-4 py-2 text-sm font-body border border-border rounded-[var(--radius-md)] bg-card text-text focus:outline-none focus:ring-2 focus:ring-navy focus:border-navy"
            >
              {MANUAL_REASON_CODES.map((code) => (
                <option key={code} value={code}>
                  {REASON_CODE_LABELS[code]}
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-2">
            <label htmlFor="adjust-notes" className="text-sm font-bold font-body text-text">
              Notes <span className="font-normal text-muted">(optional)</span>
            </label>
            <textarea
              id="adjust-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Delivery from supplier #1234"
              className="w-full px-4 py-2 text-sm font-body border border-border rounded-[var(--radius-md)] bg-card text-text focus:outline-none focus:ring-2 focus:ring-navy focus:border-navy resize-none"
              maxLength={500}
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-error font-body">{error}</p>
          )}
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={handleClose}
            className="text-sm font-body text-muted hover:text-text transition-colors"
          >
            Close without saving
          </button>
          <div className="flex-1" />
          <button
            type="submit"
            form=""
            onClick={handleSubmit as unknown as React.MouseEventHandler<HTMLButtonElement>}
            disabled={isSaving || isStockNegative}
            className="px-4 py-2 bg-navy text-white text-sm font-bold font-body rounded-[var(--radius-md)] hover:bg-navy/90 transition-colors disabled:opacity-40 flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Saving...
              </>
            ) : (
              'Save adjustment'
            )}
          </button>
        </div>
      </div>
    </>
  )
}
