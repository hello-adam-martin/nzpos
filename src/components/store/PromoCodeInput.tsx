'use client'

import { useState, useTransition } from 'react'
import { useCart } from '@/contexts/CartContext'
import { validatePromoCode } from '@/actions/promos/validatePromoCode'
import { formatNZD } from '@/lib/money'

export function PromoCodeInput() {
  const { state, dispatch, subtotalCents } = useCart()
  const [code, setCode] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isShaking, setIsShaking] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Promo already applied — show applied state
  if (state.promoCode) {
    const { promoCode, promoDiscountCents, promoDiscountType } = state
    const discountLabel =
      promoDiscountType === 'percentage'
        ? `${promoDiscountCents > 0 ? Math.round((promoDiscountCents / subtotalCents) * 100) : 0}%`
        : formatNZD(promoDiscountCents)

    return (
      <div className="py-3">
        <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-md bg-[var(--color-success)]/10 border border-[var(--color-success)]/30">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-[var(--color-success)] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm font-medium text-[var(--color-success)]">
              Code applied &mdash; {discountLabel} off
            </span>
          </div>
          <button
            type="button"
            onClick={() => dispatch({ type: 'CLEAR_PROMO' })}
            className="text-xs text-[var(--color-text-muted)] underline hover:text-[var(--color-text)] transition-colors"
          >
            Remove
          </button>
        </div>
      </div>
    )
  }

  function triggerShake() {
    setIsShaking(true)
    setTimeout(() => setIsShaking(false), 300)
  }

  async function handleApply() {
    setErrorMessage(null)
    const trimmed = code.trim()
    if (!trimmed) return

    startTransition(async () => {
      const result = await validatePromoCode({
        code: trimmed,
        cartTotalCents: subtotalCents,
      })

      if ('success' in result && result.success) {
        dispatch({
          type: 'APPLY_PROMO',
          code: result.code,
          discountCents: result.discountCents,
          discountType: result.discountType,
        })
        setCode('')
        setErrorMessage(null)
      } else if ('error' in result) {
        setErrorMessage(result.message)
        triggerShake()
      }
    })
  }

  return (
    <div className="py-3">
      <div
        className={isShaking ? 'animate-shake' : ''}
        style={
          isShaking
            ? {
                animation: 'shake 300ms ease-in-out',
              }
            : undefined
        }
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase())
              setErrorMessage(null)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleApply()
            }}
            placeholder="Promo code"
            disabled={isPending}
            className="flex-1 px-3 py-2 text-sm border border-[var(--color-border)] rounded-md bg-[var(--color-card)] text-[var(--color-text)] placeholder:text-[var(--color-text-light)] focus:outline-none focus:ring-2 focus:ring-[var(--color-navy)] disabled:opacity-50 transition-shadow"
          />
          <button
            type="button"
            onClick={handleApply}
            disabled={isPending || !code.trim()}
            className="px-4 py-2 text-sm font-medium bg-[var(--color-navy)] text-white rounded-md hover:bg-[var(--color-navy-light)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 shrink-0"
          >
            {isPending ? 'Checking…' : 'Apply Code'}
          </button>
        </div>

        {/* Error message */}
        <div aria-live="polite" className="mt-1 min-h-[1.25rem]">
          {errorMessage && (
            <p className="text-xs text-[var(--color-error)]">{errorMessage}</p>
          )}
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-3px); }
          40% { transform: translateX(3px); }
          60% { transform: translateX(-3px); }
          80% { transform: translateX(3px); }
        }
        .animate-shake {
          animation: shake 300ms ease-in-out;
        }
      `}</style>
    </div>
  )
}
