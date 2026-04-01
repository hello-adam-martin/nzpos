'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import type { CartItem } from '@/lib/cart'
import { formatNZD } from '@/lib/money'

type DiscountSheetProps = {
  item: CartItem | null
  isOpen: boolean
  onClose: () => void
  onApply: (discountCents: number, discountType: 'percentage' | 'fixed', reason?: string) => void
}

const REASON_OPTIONS = [
  { value: '', label: 'Reason (optional)' },
  { value: 'Staff discount', label: 'Staff discount' },
  { value: 'Damaged item', label: 'Damaged item' },
  { value: 'Loyalty reward', label: 'Loyalty reward' },
  { value: 'Other', label: 'Other' },
]

export function DiscountSheet({ item, isOpen, onClose, onApply }: DiscountSheetProps) {
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')

  function computeDiscountCents(): number {
    if (!item || !amount) return 0
    const value = parseFloat(amount)
    if (isNaN(value) || value <= 0) return 0

    if (discountType === 'percentage') {
      const pct = Math.min(value, 100)
      return Math.round(item.unitPriceCents * item.quantity * pct / 100)
    } else {
      return Math.round(value * 100)
    }
  }

  const discountCents = computeDiscountCents()
  const isValid = discountCents > 0

  function handleApply() {
    if (!isValid) return
    onApply(discountCents, discountType, reason || undefined)
    setAmount('')
    setReason('')
    onClose()
  }

  function handleTypeChange(type: 'percentage' | 'fixed') {
    setDiscountType(type)
    setAmount('')
  }

  const lineTotal = item ? item.unitPriceCents * item.quantity : 0
  const discountedTotal = Math.max(0, lineTotal - discountCents)

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Slide-in panel */}
      <div
        className={[
          'fixed top-0 right-0 h-full w-80 bg-card shadow-xl z-50',
          'transform transition-transform duration-150 ease-out',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
        role="dialog"
        aria-modal="true"
        aria-label="Apply discount"
      >
        <div className="flex flex-col h-full p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-text-muted font-normal">Discount on</p>
              <h2 className="text-base font-bold text-text truncate">
                {item?.productName ?? ''}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="ml-3 flex items-center justify-center w-11 h-11 rounded-lg text-text-muted hover:text-text hover:bg-surface"
              aria-label="Close discount sheet"
            >
              <X size={20} />
            </button>
          </div>

          {/* Line total context */}
          {item && (
            <p className="text-sm text-text-muted mb-4">
              Line total: <span className="font-bold text-text">{formatNZD(lineTotal)}</span>
              {isValid && (
                <> → <span className="font-bold text-success">{formatNZD(discountedTotal)}</span></>
              )}
            </p>
          )}

          {/* Discount type toggle */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => handleTypeChange('percentage')}
              className={[
                'flex-1 min-h-[44px] rounded-lg text-base font-bold border transition-colors',
                discountType === 'percentage'
                  ? 'bg-navy text-white border-navy'
                  : 'bg-transparent text-navy border-border hover:border-navy',
              ].join(' ')}
            >
              % Percentage
            </button>
            <button
              onClick={() => handleTypeChange('fixed')}
              className={[
                'flex-1 min-h-[44px] rounded-lg text-base font-bold border transition-colors',
                discountType === 'fixed'
                  ? 'bg-navy text-white border-navy'
                  : 'bg-transparent text-navy border-border hover:border-navy',
              ].join(' ')}
            >
              $ Fixed
            </button>
          </div>

          {/* Amount input */}
          <div className="mb-4">
            <label className="block text-sm text-text-muted mb-1">
              {discountType === 'percentage' ? 'Percentage off (0–100)' : 'Amount off ($)'}
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={discountType === 'percentage' ? '10' : '5.00'}
              className="text-3xl font-display font-bold text-center w-full py-4 px-3 border border-border rounded-lg bg-bg focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/20"
              autoFocus={isOpen}
            />
            {discountType === 'percentage' && amount && parseFloat(amount) > 100 && (
              <p className="text-sm text-error mt-1">Percentage cannot exceed 100%</p>
            )}
          </div>

          {/* Reason dropdown */}
          <div className="mb-6">
            <label className="block text-sm text-text-muted mb-1">Reason</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full min-h-[44px] text-base border border-border rounded-lg px-3 bg-card text-text focus:outline-none focus:border-navy"
            >
              {REASON_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Apply button */}
          <button
            onClick={handleApply}
            disabled={!isValid}
            className={[
              'w-full min-h-[48px] bg-navy text-white text-base font-bold rounded-lg transition-opacity',
              !isValid ? 'opacity-50 pointer-events-none' : 'hover:bg-navy/90',
            ].join(' ')}
          >
            Apply Discount
          </button>
        </div>
      </div>
    </>
  )
}
