'use client'

import { useState, useTransition } from 'react'
import type { Database } from '@/types/database'
import { updatePromoCode } from '@/actions/promos/updatePromoCode'

type PromoCode = Database['public']['Tables']['promo_codes']['Row']

interface Props {
  promo: PromoCode
  onClose: () => void
}

function formatDatetimeLocal(isoString: string | null): string {
  if (!isoString) return ''
  // datetime-local input expects "YYYY-MM-DDTHH:mm"
  return new Date(isoString).toISOString().slice(0, 16)
}

/**
 * EditPromoModal — pre-filled edit form for an existing promo code.
 * Triggered by the "Edit" row action in PromoList.
 */
export function EditPromoModal({ promo, onClose }: Props) {
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>(
    promo.discount_type as 'percentage' | 'fixed',
  )
  // For percentage: show as integer (e.g. 10 for 10%)
  // For fixed: show as dollars (e.g. 5.00 for NZ$5 stored as 500 cents)
  const [discountValue, setDiscountValue] = useState<string>(
    promo.discount_type === 'fixed'
      ? (promo.discount_value / 100).toFixed(2)
      : String(promo.discount_value),
  )
  const [minOrder, setMinOrder] = useState<string>(
    promo.min_order_cents && promo.min_order_cents > 0
      ? (promo.min_order_cents / 100).toFixed(2)
      : '',
  )
  const [maxUses, setMaxUses] = useState<string>(
    promo.max_uses !== null ? String(promo.max_uses) : '',
  )
  const [expiresAt, setExpiresAt] = useState<string>(formatDatetimeLocal(promo.expires_at))
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSave = () => {
    setError(null)

    // Convert display values back to storage format
    let parsedDiscountValue: number
    if (discountType === 'fixed') {
      parsedDiscountValue = Math.round(parseFloat(discountValue || '0') * 100)
    } else {
      parsedDiscountValue = parseInt(discountValue || '0', 10)
    }

    const parsedMinOrder = minOrder ? Math.round(parseFloat(minOrder) * 100) : 0
    const parsedMaxUses = maxUses ? parseInt(maxUses, 10) : null
    const parsedExpiresAt = expiresAt ? new Date(expiresAt).toISOString() : null

    startTransition(async () => {
      const result = await updatePromoCode({
        id: promo.id,
        discount_type: discountType,
        discount_value: parsedDiscountValue,
        min_order_cents: parsedMinOrder,
        max_uses: parsedMaxUses,
        expires_at: parsedExpiresAt,
      })

      if ('error' in result) {
        setError(result.error)
      } else {
        onClose()
      }
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-[var(--space-xl)] shadow-xl">
        <h2 className="font-display font-bold text-2xl text-[var(--color-text)] mb-[var(--space-lg)]">
          Edit Promo Code
        </h2>

        {/* Promo code (read-only) */}
        <div className="mb-4">
          <p className="text-sm font-sans text-[var(--color-text-muted)] mb-1">Promo Code</p>
          <p className="font-mono font-bold text-[var(--color-text)] tracking-wide">{promo.code}</p>
        </div>

        {/* Discount Type */}
        <div className="mb-4">
          <label
            htmlFor="edit-discount-type"
            className="block text-sm font-sans font-normal text-[var(--color-text)] mb-1"
          >
            Discount Type
          </label>
          <select
            id="edit-discount-type"
            value={discountType}
            onChange={(e) => setDiscountType(e.target.value as 'percentage' | 'fixed')}
            className="w-full px-3 py-2 rounded-md border border-[var(--color-border)] bg-white text-sm font-sans text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-navy)]/20 focus:border-[var(--color-navy)]/40"
          >
            <option value="percentage">Percentage</option>
            <option value="fixed">Fixed Amount</option>
          </select>
        </div>

        {/* Discount Value */}
        <div className="mb-4">
          <label
            htmlFor="edit-discount-value"
            className="block text-sm font-sans font-normal text-[var(--color-text)] mb-1"
          >
            Discount Value
          </label>
          <input
            id="edit-discount-value"
            type="number"
            min="0"
            step="0.01"
            value={discountValue}
            onChange={(e) => setDiscountValue(e.target.value)}
            className="w-full h-10 px-3 rounded-md border border-[var(--color-border)] bg-white text-sm font-sans text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-navy)]/20 focus:border-[var(--color-navy)]/40"
          />
          <p className="mt-1 text-xs text-[var(--color-text-muted)] font-sans">
            {discountType === 'percentage'
              ? 'Whole number (e.g. 10 = 10%)'
              : 'NZD amount (e.g. 5.00 = NZ$5.00)'}
          </p>
        </div>

        {/* Min Order */}
        <div className="mb-4">
          <label
            htmlFor="edit-min-order"
            className="block text-sm font-sans font-normal text-[var(--color-text)] mb-1"
          >
            Minimum Order (NZ$)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] text-sm font-sans select-none">
              NZ$
            </span>
            <input
              id="edit-min-order"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={minOrder}
              onChange={(e) => setMinOrder(e.target.value)}
              className="w-full pl-11 pr-3 h-10 rounded-md border border-[var(--color-border)] bg-white text-sm font-sans text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-navy)]/20 focus:border-[var(--color-navy)]/40"
            />
          </div>
          <p className="mt-1 text-xs text-[var(--color-text-muted)] font-sans">
            Leave blank or 0 for no minimum.
          </p>
        </div>

        {/* Max Uses */}
        <div className="mb-4">
          <label
            htmlFor="edit-max-uses"
            className="block text-sm font-sans font-normal text-[var(--color-text)] mb-1"
          >
            Maximum Uses
          </label>
          <input
            id="edit-max-uses"
            type="number"
            min="1"
            step="1"
            placeholder="Leave blank for unlimited"
            value={maxUses}
            onChange={(e) => setMaxUses(e.target.value)}
            className="w-full h-10 px-3 rounded-md border border-[var(--color-border)] bg-white text-sm font-sans text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-navy)]/20 focus:border-[var(--color-navy)]/40"
          />
        </div>

        {/* Expiry Date */}
        <div className="mb-6">
          <label
            htmlFor="edit-expires-at"
            className="block text-sm font-sans font-normal text-[var(--color-text)] mb-1"
          >
            Expiry Date
          </label>
          <input
            id="edit-expires-at"
            type="datetime-local"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="w-full h-10 px-3 rounded-md border border-[var(--color-border)] bg-white text-sm font-sans text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-navy)]/20 focus:border-[var(--color-navy)]/40"
          />
          <p className="mt-1 text-xs text-[var(--color-text-muted)] font-sans">
            Leave blank for no expiry.
          </p>
        </div>

        {/* Error message */}
        {error && (
          <p className="mb-4 text-sm font-sans text-[var(--color-error)]" role="alert">
            {error}
          </p>
        )}

        {/* Actions */}
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="w-full min-h-[44px] rounded-md bg-[var(--color-amber)] text-white font-sans font-bold text-sm transition-colors duration-150 hover:bg-[var(--color-accent-hover)] disabled:opacity-60 disabled:cursor-not-allowed mb-3"
        >
          {isPending ? 'Saving...' : 'Save Changes'}
        </button>

        <button
          type="button"
          onClick={onClose}
          disabled={isPending}
          className="w-full min-h-[44px] rounded-md border border-[var(--color-border)] bg-transparent text-[var(--color-text)] font-sans font-normal text-sm transition-colors duration-150 hover:bg-[var(--color-surface)] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          Discard Changes
        </button>
      </div>
    </div>
  )
}
