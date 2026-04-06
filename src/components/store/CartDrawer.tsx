'use client'

import { useTransition, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useCart } from '@/contexts/CartContext'
import { CartLineItem } from './CartLineItem'
import { CartSummary } from './CartSummary'
import { PromoCodeInput } from './PromoCodeInput'
import { GiftCardInput, type AppliedGiftCard } from './GiftCardInput'
import { createCheckoutSession } from '@/actions/orders/createCheckoutSession'
import { formatNZD } from '@/lib/money'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface CartDrawerProps {
  storeId: string
  hasGiftCards?: boolean
}

export function CartDrawer({ storeId, hasGiftCards = false }: CartDrawerProps) {
  const { state, dispatch, itemCount, totalCents } = useCart()
  const [isPending, startTransition] = useTransition()
  const drawerRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  // Gift card state (local — not persisted to cart context)
  const [appliedGiftCard, setAppliedGiftCard] = useState<AppliedGiftCard | null>(null)

  const { isDrawerOpen, items, promoCode } = state

  // Reset gift card when drawer closes or cart is cleared
  useEffect(() => {
    if (!isDrawerOpen) {
      setAppliedGiftCard(null)
    }
  }, [isDrawerOpen])

  // Reset gift card if cart items change (to avoid stale coverage math)
  useEffect(() => {
    if (items.length === 0) {
      setAppliedGiftCard(null)
    }
  }, [items])

  // Focus management: focus close button when drawer opens
  useEffect(() => {
    if (isDrawerOpen) {
      closeButtonRef.current?.focus()
    }
  }, [isDrawerOpen])

  // Trap focus within drawer when open
  useEffect(() => {
    if (!isDrawerOpen) return

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        dispatch({ type: 'CLOSE_DRAWER' })
        return
      }

      if (e.key !== 'Tab') return

      const drawer = drawerRef.current
      if (!drawer) return

      const focusable = drawer.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last?.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first?.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isDrawerOpen, dispatch])

  // ---------------------------------------------------------------------------
  // Computed: effective total after gift card (for Stripe charge)
  // ---------------------------------------------------------------------------

  const giftCardAmountCents = appliedGiftCard?.giftCardAmountCents ?? 0
  const remainingAfterGiftCard = Math.max(0, totalCents - giftCardAmountCents)
  const isFullyCoveredByGiftCard = appliedGiftCard !== null && remainingAfterGiftCard === 0

  // ---------------------------------------------------------------------------
  // Checkout handler
  // ---------------------------------------------------------------------------

  async function handleCheckout() {
    startTransition(async () => {
      const promoId = promoCode ? (state as { promoId?: string }).promoId : undefined

      const result = await createCheckoutSession({
        items: items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
        promoId,
        promoDiscountCents: state.promoDiscountCents > 0 ? state.promoDiscountCents : undefined,
        promoDiscountType: state.promoDiscountType ?? undefined,
        // Gift card fields (optional — only when applied)
        giftCardCode: appliedGiftCard?.code,
        giftCardAmountCents: appliedGiftCard?.giftCardAmountCents,
      })

      if ('url' in result && result.url) {
        // Partial cover: redirect to Stripe
        window.location.href = result.url
      } else if ('redirect' in result && result.redirect) {
        // Full cover: server handled order, redirect to confirmation
        dispatch({ type: 'CLEAR_CART' })
        window.location.href = result.redirect
      } else if ('error' in result) {
        const err = result as { error: string; productName?: string }
        alert(
          err.error === 'out_of_stock'
            ? `Sorry, "${err.productName}" is out of stock. Please remove it from your cart.`
            : err.error === 'gift_card_invalid'
              ? 'Your gift card is no longer valid. Please remove it and try again.'
              : 'Something went wrong. Please try again.'
        )
      }
    })
  }

  return (
    <>
      {/* Backdrop */}
      {isDrawerOpen && (
        <div
          className="fixed inset-0 bg-[var(--color-navy)]/30 z-40"
          onClick={() => dispatch({ type: 'CLOSE_DRAWER' })}
          aria-hidden="true"
        />
      )}

      {/* Drawer panel */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
        className={[
          'fixed z-50 bg-[var(--color-card)] border-[var(--color-border)] shadow-[0_4px_24px_rgba(30,41,59,0.12)]',
          // Desktop: right side panel
          'md:top-0 md:right-0 md:h-full md:w-[380px] md:border-l md:translate-y-0',
          // Mobile: bottom sheet
          'bottom-0 left-0 right-0 md:left-auto h-[85vh] md:h-full border-t md:border-t-0 rounded-t-xl md:rounded-none',
          'flex flex-col',
          'transition-transform duration-[250ms] ease-in-out',
          isDrawerOpen
            ? 'translate-x-0 md:translate-x-0'
            : 'translate-x-0 translate-y-full md:translate-y-0 md:translate-x-full',
        ].join(' ')}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-[var(--color-border)] shrink-0">
          <h2 className="text-lg font-semibold text-[var(--color-text)]">
            Your Cart
            {itemCount > 0 && (
              <span className="ml-2 text-sm font-normal text-[var(--color-text-muted)]">
                ({itemCount} {itemCount === 1 ? 'item' : 'items'})
              </span>
            )}
          </h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={() => dispatch({ type: 'CLOSE_DRAWER' })}
            aria-label="Close cart"
            className="p-2 rounded-md text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] transition-colors duration-100"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        {items.length === 0 ? (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center">
            <svg
              className="w-16 h-16 text-[var(--color-text-light)] mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <h3 className="text-base font-semibold text-[var(--color-text)] mb-2">
              Your cart is empty
            </h3>
            <p className="text-sm text-[var(--color-text-muted)] mb-6">
              Browse our products and add something you like.
            </p>
            <Link
              href="/"
              onClick={() => dispatch({ type: 'CLOSE_DRAWER' })}
              className="px-4 py-2 text-sm font-medium bg-[var(--color-navy)] text-white rounded-md hover:bg-[var(--color-navy-light)] transition-colors duration-150"
            >
              Continue Shopping
            </Link>
          </div>
        ) : (
          <>
            {/* Scrollable items list */}
            <div className="flex-1 overflow-y-auto px-4">
              {items.map((item) => (
                <CartLineItem
                  key={item.productId}
                  item={item}
                  onQuantityChange={(qty) =>
                    dispatch({ type: 'SET_QUANTITY', productId: item.productId, quantity: qty })
                  }
                  onRemove={() =>
                    dispatch({ type: 'REMOVE_ITEM', productId: item.productId })
                  }
                />
              ))}

              <PromoCodeInput />
              <CartSummary />

              {/* Gift card section — shown when store has gift cards enabled */}
              {hasGiftCards && (
                <>
                  <div className="border-t border-[var(--color-border)]" />
                  <GiftCardInput
                    storeId={storeId}
                    totalCents={totalCents}
                    applied={appliedGiftCard}
                    onApply={setAppliedGiftCard}
                    onRemove={() => setAppliedGiftCard(null)}
                  />
                </>
              )}

              {/* Gift card adjusted total — shown when partially covered */}
              {appliedGiftCard && !isFullyCoveredByGiftCard && (
                <div className="py-2 border-t border-[var(--color-border)]">
                  <div className="flex justify-between text-sm text-[var(--color-text-muted)]">
                    <span>Gift card</span>
                    <span className="tabular-nums text-[var(--color-success)]">
                      -{formatNZD(giftCardAmountCents)}
                    </span>
                  </div>
                  <div className="flex justify-between text-base font-semibold text-[var(--color-text)] pt-1">
                    <span>Remaining to pay</span>
                    <span className="tabular-nums">{formatNZD(remainingAfterGiftCard)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Footer CTA */}
            <div className="px-4 py-4 border-t border-[var(--color-border)] shrink-0">
              {isFullyCoveredByGiftCard ? (
                /* Full cover: "Complete Order" — no Stripe, no logo */
                <button
                  type="button"
                  onClick={handleCheckout}
                  disabled={isPending || items.length === 0}
                  className="w-full py-3 px-6 bg-[var(--color-navy)] text-white text-base font-semibold rounded-lg hover:bg-[var(--color-navy-light)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
                >
                  {isPending ? 'Processing…' : 'Complete Order'}
                </button>
              ) : (
                /* Normal: Stripe checkout */
                <button
                  type="button"
                  onClick={handleCheckout}
                  disabled={isPending || items.length === 0}
                  className="w-full py-3 px-6 bg-[var(--color-amber)] text-white text-base font-semibold rounded-lg hover:bg-[var(--color-amber-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150"
                >
                  {isPending ? 'Redirecting…' : 'Proceed to Checkout'}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </>
  )
}
