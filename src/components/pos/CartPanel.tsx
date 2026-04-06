'use client'

import type { CartState, CartAction } from '@/lib/cart'
import { calcCartTotals } from '@/lib/cart'
import { CartLineItem } from './CartLineItem'
import { CartSummary } from './CartSummary'
import { PaymentMethodToggle } from './PaymentMethodToggle'
import { PayButton } from './PayButton'
import { LoyaltyRedemptionRow } from './LoyaltyRedemptionRow'

type CartPanelProps = {
  cart: CartState
  dispatch: React.Dispatch<CartAction>
  staffRole: 'owner' | 'staff'
  onOpenDiscount: (productId: string) => void
  showGiftCard?: boolean
  // Loyalty
  hasLoyalty?: boolean
  redeemRateCents?: number
  onOpenCustomerLookup?: () => void
}

export function CartPanel({
  cart,
  dispatch,
  onOpenDiscount,
  showGiftCard,
  hasLoyalty = false,
  redeemRateCents = 1,
  onOpenCustomerLookup,
}: CartPanelProps) {
  const itemCount = cart.items.reduce((sum, i) => sum + i.quantity, 0)
  const totals = calcCartTotals(cart.items)

  const hasCustomer = cart.attachedCustomerId !== null

  return (
    <div className="flex flex-col h-full overflow-hidden bg-surface border-l border-border">
      {/* Header */}
      <div className="flex items-center px-4 py-3 border-b border-border">
        <h2 className="text-xl font-bold text-text">Order</h2>
        {itemCount > 0 && (
          <span className="text-sm text-text-muted ml-2">({itemCount} {itemCount === 1 ? 'item' : 'items'})</span>
        )}
      </div>

      {/* Line items or empty state */}
      {cart.items.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 text-center">
          <p className="text-xl font-bold text-text-muted">No items yet</p>
          <p className="text-sm text-text-muted mt-2">Tap a product to add it to the order.</p>
        </div>
      ) : (
        <>
          <div className="flex-1 min-h-0 overflow-y-auto px-2 py-2 space-y-1">
            {cart.items.map((item) => (
              <CartLineItem
                key={item.productId}
                item={item}
                onSetQuantity={(qty) =>
                  dispatch({ type: 'SET_QUANTITY', productId: item.productId, quantity: qty })
                }
                onRemove={() =>
                  dispatch({ type: 'REMOVE_ITEM', productId: item.productId })
                }
                onOpenDiscount={() => onOpenDiscount(item.productId)}
              />
            ))}
          </div>

          {/* Bottom section: loyalty row + summary + payment toggle + pay button */}
          <div className="border-t border-border p-4 space-y-3">
            {/* Add Customer button (loyalty add-on only) */}
            {hasLoyalty && (
              <>
                {!hasCustomer ? (
                  <button
                    type="button"
                    onClick={onOpenCustomerLookup}
                    className="w-full min-h-[44px] text-sm font-semibold text-navy border border-border rounded-lg hover:bg-surface transition-colors"
                  >
                    Add Customer
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={onOpenCustomerLookup}
                      className="flex-1 min-h-[44px] text-sm font-semibold text-white bg-amber rounded-lg hover:bg-amber/90 transition-colors truncate px-3"
                    >
                      {cart.attachedCustomerName ?? 'Customer'}
                    </button>
                    <button
                      type="button"
                      onClick={() => dispatch({ type: 'DETACH_CUSTOMER' })}
                      className="min-h-[44px] w-11 flex items-center justify-center text-text-muted border border-border rounded-lg hover:bg-surface transition-colors flex-shrink-0"
                      aria-label="Remove customer"
                    >
                      ×
                    </button>
                  </div>
                )}

                {/* Loyalty redemption row (shown when customer attached) */}
                {hasCustomer && cart.attachedCustomerName && cart.attachedCustomerPoints !== null && (
                  <LoyaltyRedemptionRow
                    customerName={cart.attachedCustomerName}
                    pointsBalance={cart.attachedCustomerPoints}
                    redeemRateCents={redeemRateCents}
                    loyaltyDiscountCents={cart.loyaltyDiscountCents}
                    onApply={(discountCents, pointsRedeemed) =>
                      dispatch({ type: 'APPLY_LOYALTY_DISCOUNT', discountCents, pointsRedeemed })
                    }
                    onRemove={() => dispatch({ type: 'REMOVE_LOYALTY_DISCOUNT' })}
                  />
                )}
              </>
            )}

            <CartSummary items={cart.items} />
            <PaymentMethodToggle
              selected={cart.paymentMethod}
              onSelect={(method) => dispatch({ type: 'SET_PAYMENT_METHOD', method })}
              showGiftCard={showGiftCard}
            />
            <PayButton
              totalCents={totals.totalCents}
              disabled={cart.items.length === 0 || cart.paymentMethod === null}
              onClick={() => dispatch({ type: 'INITIATE_PAYMENT' })}
            />
          </div>
        </>
      )}
    </div>
  )
}
