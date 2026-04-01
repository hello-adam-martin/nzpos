'use client'

import type { CartState, CartAction } from '@/lib/cart'
import { calcCartTotals } from '@/lib/cart'
import { CartLineItem } from './CartLineItem'
import { CartSummary } from './CartSummary'
import { PaymentMethodToggle } from './PaymentMethodToggle'
import { PayButton } from './PayButton'

type CartPanelProps = {
  cart: CartState
  dispatch: React.Dispatch<CartAction>
  staffRole: 'owner' | 'staff'
  onOpenDiscount: (productId: string) => void
}

export function CartPanel({ cart, dispatch, onOpenDiscount }: CartPanelProps) {
  const itemCount = cart.items.reduce((sum, i) => sum + i.quantity, 0)
  const totals = calcCartTotals(cart.items)

  return (
    <div className="flex flex-col h-full bg-surface border-l border-border">
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
          <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1">
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

          {/* Bottom section: summary + payment toggle + pay button */}
          <div className="border-t border-border p-4 space-y-3">
            <CartSummary items={cart.items} />
            <PaymentMethodToggle
              selected={cart.paymentMethod}
              onSelect={(method) => dispatch({ type: 'SET_PAYMENT_METHOD', method })}
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
