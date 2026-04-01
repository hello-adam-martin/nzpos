'use client'
import { useActionState, useEffect, useRef } from 'react'
import { createPromoCode } from '@/actions/promos/createPromoCode'

type FormState = {
  error?: Record<string, string[]>
  success?: boolean
} | null

const initialState: FormState = null

export default function PromoForm() {
  const [state, formAction, isPending] = useActionState(
    async (_prevState: FormState, formData: FormData) => {
      const discountType = formData.get('discount_type') as 'percentage' | 'fixed'
      const rawValue = formData.get('discount_value') as string
      const rawMin = formData.get('min_order_amount') as string
      const rawMaxUses = formData.get('max_uses') as string
      const expiresAt = formData.get('expires_at') as string

      // Convert discount value to cents or percentage integer
      let discountValue: number
      if (discountType === 'fixed') {
        // Dollar input → cents
        discountValue = Math.round(parseFloat(rawValue || '0') * 100)
      } else {
        discountValue = parseInt(rawValue || '0', 10)
      }

      const minOrderCents = rawMin
        ? Math.round(parseFloat(rawMin) * 100)
        : 0

      // datetime-local returns "YYYY-MM-DDTHH:mm" — append seconds+Z for Zod .datetime()
      const expiresAtISO = expiresAt
        ? new Date(expiresAt).toISOString()
        : undefined

      const input = {
        code: formData.get('code') as string,
        discount_type: discountType,
        discount_value: discountValue,
        min_order_cents: minOrderCents,
        max_uses: rawMaxUses ? parseInt(rawMaxUses, 10) : undefined,
        expires_at: expiresAtISO,
      }

      return createPromoCode(input)
    },
    initialState
  )

  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset()
    }
  }, [state?.success])

  const errors = state?.error ?? {}

  return (
    <div className="bg-card rounded-[var(--radius-lg)] border border-border p-6 max-w-2xl">
      <h2 className="font-display text-xl font-semibold text-primary mb-6">Create Promo Code</h2>

      {errors._form && (
        <div className="mb-4 p-3 rounded-[var(--radius-md)] bg-error/10 border border-error/30 text-error text-sm">
          {errors._form.join(', ')}
        </div>
      )}

      {state?.success && (
        <div className="mb-4 p-3 rounded-[var(--radius-md)] bg-success/10 border border-success/30 text-success text-sm">
          Promo code created successfully.
        </div>
      )}

      <form ref={formRef} action={formAction} className="space-y-4">
        {/* Code */}
        <div>
          <label htmlFor="code" className="block text-sm font-semibold text-text mb-1 font-sans">
            Code <span className="text-error">*</span>
          </label>
          <input
            id="code"
            name="code"
            type="text"
            required
            placeholder="e.g. SUMMER20"
            className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-border bg-bg text-text font-sans text-sm focus:outline-none focus:ring-2 focus:ring-amber/40 focus:border-amber uppercase"
            style={{ textTransform: 'uppercase' }}
          />
          {errors.code && (
            <p className="mt-1 text-xs text-error font-sans">{errors.code[0]}</p>
          )}
        </div>

        {/* Discount Type */}
        <div>
          <label htmlFor="discount_type" className="block text-sm font-semibold text-text mb-1 font-sans">
            Discount Type <span className="text-error">*</span>
          </label>
          <select
            id="discount_type"
            name="discount_type"
            required
            className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-border bg-bg text-text font-sans text-sm focus:outline-none focus:ring-2 focus:ring-amber/40 focus:border-amber"
          >
            <option value="percentage">Percentage</option>
            <option value="fixed">Fixed Amount</option>
          </select>
          {errors.discount_type && (
            <p className="mt-1 text-xs text-error font-sans">{errors.discount_type[0]}</p>
          )}
        </div>

        {/* Discount Value */}
        <div>
          <label htmlFor="discount_value" className="block text-sm font-semibold text-text mb-1 font-sans">
            Discount Value <span className="text-error">*</span>
          </label>
          <div className="relative">
            <input
              id="discount_value"
              name="discount_value"
              type="number"
              min="0"
              step="0.01"
              required
              placeholder="e.g. 10 for 10% or 5.00 for NZ$5"
              className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-border bg-bg text-text font-sans text-sm focus:outline-none focus:ring-2 focus:ring-amber/40 focus:border-amber"
            />
          </div>
          <p className="mt-1 text-xs text-text-muted font-sans">
            For percentage: enter whole number (e.g. 10 = 10%). For fixed amount: enter NZD (e.g. 5.00 = NZ$5.00).
          </p>
          {errors.discount_value && (
            <p className="mt-1 text-xs text-error font-sans">{errors.discount_value[0]}</p>
          )}
        </div>

        {/* Minimum Order Amount */}
        <div>
          <label htmlFor="min_order_amount" className="block text-sm font-semibold text-text mb-1 font-sans">
            Minimum Order (NZ$)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-sm font-sans select-none">
              NZ$
            </span>
            <input
              id="min_order_amount"
              name="min_order_amount"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              className="w-full pl-11 pr-3 py-2 rounded-[var(--radius-md)] border border-border bg-bg text-text font-sans text-sm focus:outline-none focus:ring-2 focus:ring-amber/40 focus:border-amber"
            />
          </div>
          <p className="mt-1 text-xs text-text-muted font-sans">Leave blank or 0 for no minimum.</p>
          {errors.min_order_cents && (
            <p className="mt-1 text-xs text-error font-sans">{errors.min_order_cents[0]}</p>
          )}
        </div>

        {/* Maximum Uses */}
        <div>
          <label htmlFor="max_uses" className="block text-sm font-semibold text-text mb-1 font-sans">
            Maximum Uses
          </label>
          <input
            id="max_uses"
            name="max_uses"
            type="number"
            min="1"
            step="1"
            placeholder="Leave blank for unlimited"
            className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-border bg-bg text-text font-sans text-sm focus:outline-none focus:ring-2 focus:ring-amber/40 focus:border-amber"
          />
          {errors.max_uses && (
            <p className="mt-1 text-xs text-error font-sans">{errors.max_uses[0]}</p>
          )}
        </div>

        {/* Expiry Date */}
        <div>
          <label htmlFor="expires_at" className="block text-sm font-semibold text-text mb-1 font-sans">
            Expiry Date
          </label>
          <input
            id="expires_at"
            name="expires_at"
            type="datetime-local"
            className="w-full px-3 py-2 rounded-[var(--radius-md)] border border-border bg-bg text-text font-sans text-sm focus:outline-none focus:ring-2 focus:ring-amber/40 focus:border-amber"
          />
          <p className="mt-1 text-xs text-text-muted font-sans">Leave blank for no expiry.</p>
          {errors.expires_at && (
            <p className="mt-1 text-xs text-error font-sans">{errors.expires_at[0]}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full py-2.5 px-4 rounded-[var(--radius-md)] bg-navy text-white font-sans font-semibold text-sm transition-colors duration-150 hover:bg-navy-light disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isPending ? 'Creating...' : 'Create Promo Code'}
        </button>
      </form>
    </div>
  )
}
