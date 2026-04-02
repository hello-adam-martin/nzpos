'use client'
import { formatNZD } from '@/lib/money'

export interface OrderItemForRefund {
  id: string
  product_name: string
  quantity: number
  unit_price_cents: number
  discount_cents: number
  line_total_cents: number
}

export interface RefundItemSelection {
  orderItemId: string
  quantityToRefund: number
  refundCents: number
}

interface RefundItemSelectorProps {
  items: OrderItemForRefund[]
  alreadyRefundedQty: Map<string, number>
  selections: RefundItemSelection[]
  onSelectionsChange: (selections: RefundItemSelection[]) => void
}

function calculateItemRefundCents(item: OrderItemForRefund, quantityToRefund: number): number {
  return Math.floor((quantityToRefund / item.quantity) * item.line_total_cents)
}

export function RefundItemSelector({
  items,
  alreadyRefundedQty,
  selections,
  onSelectionsChange,
}: RefundItemSelectorProps) {
  const totalRefundCents = selections.reduce((sum, s) => sum + s.refundCents, 0)

  function isFullyRefunded(item: OrderItemForRefund): boolean {
    const refunded = alreadyRefundedQty.get(item.id) ?? 0
    return refunded >= item.quantity
  }

  function getMaxRefundable(item: OrderItemForRefund): number {
    const refunded = alreadyRefundedQty.get(item.id) ?? 0
    return item.quantity - refunded
  }

  function getSelection(itemId: string): RefundItemSelection | undefined {
    return selections.find((s) => s.orderItemId === itemId)
  }

  function handleCheckbox(item: OrderItemForRefund, checked: boolean) {
    if (checked) {
      const maxQty = getMaxRefundable(item)
      const refundCents = calculateItemRefundCents(item, maxQty)
      onSelectionsChange([
        ...selections.filter((s) => s.orderItemId !== item.id),
        { orderItemId: item.id, quantityToRefund: maxQty, refundCents },
      ])
    } else {
      onSelectionsChange(selections.filter((s) => s.orderItemId !== item.id))
    }
  }

  function handleQuantityChange(item: OrderItemForRefund, delta: number) {
    const existing = getSelection(item.id)
    if (!existing) return
    const maxQty = getMaxRefundable(item)
    const newQty = Math.max(1, Math.min(maxQty, existing.quantityToRefund + delta))
    const refundCents = calculateItemRefundCents(item, newQty)
    onSelectionsChange(
      selections.map((s) =>
        s.orderItemId === item.id ? { ...s, quantityToRefund: newQty, refundCents } : s
      )
    )
  }

  function handleSelectAll(checked: boolean) {
    if (checked) {
      const newSelections: RefundItemSelection[] = items
        .filter((item) => !isFullyRefunded(item))
        .map((item) => {
          const maxQty = getMaxRefundable(item)
          return {
            orderItemId: item.id,
            quantityToRefund: maxQty,
            refundCents: calculateItemRefundCents(item, maxQty),
          }
        })
      onSelectionsChange(newSelections)
    } else {
      onSelectionsChange([])
    }
  }

  const refundableItems = items.filter((item) => !isFullyRefunded(item))
  const isAllSelected =
    refundableItems.length > 0 && refundableItems.every((item) => !!getSelection(item.id))

  return (
    <div className="flex flex-col gap-0">
      {/* Select All toggle */}
      <div className="flex items-center gap-3 px-4 py-3 bg-surface border-b border-border">
        <input
          type="checkbox"
          id="refund-select-all"
          checked={isAllSelected}
          onChange={(e) => handleSelectAll(e.target.checked)}
          className="w-4 h-4 rounded border-border text-amber accent-amber cursor-pointer"
        />
        <label
          htmlFor="refund-select-all"
          className="text-sm font-bold font-sans text-text cursor-pointer select-none"
        >
          Select All Items
        </label>
      </div>

      {/* Item list */}
      <div className="divide-y divide-border">
        {items.map((item) => {
          const alreadyRefunded = alreadyRefundedQty.get(item.id) ?? 0
          const fullyRefunded = isFullyRefunded(item)
          const selection = getSelection(item.id)
          const isSelected = !!selection
          const maxQty = getMaxRefundable(item)

          return (
            <div
              key={item.id}
              className={[
                'flex items-start gap-3 px-4 py-3',
                fullyRefunded ? 'opacity-40' : '',
              ].join(' ')}
            >
              {/* Checkbox */}
              <div className="flex-shrink-0 pt-0.5">
                <input
                  type="checkbox"
                  id={`refund-item-${item.id}`}
                  checked={isSelected}
                  disabled={fullyRefunded}
                  onChange={(e) => handleCheckbox(item, e.target.checked)}
                  className="w-4 h-4 rounded border-border text-amber accent-amber cursor-pointer disabled:cursor-not-allowed"
                />
              </div>

              {/* Item details */}
              <div className="flex-1 min-w-0">
                <label
                  htmlFor={`refund-item-${item.id}`}
                  className={[
                    'text-sm font-sans font-medium text-text block',
                    fullyRefunded ? 'cursor-not-allowed' : 'cursor-pointer',
                  ].join(' ')}
                >
                  {item.product_name}
                </label>
                {alreadyRefunded > 0 && (
                  <p className="text-xs font-sans text-text-muted mt-0.5">
                    ({alreadyRefunded} of {item.quantity} already refunded)
                  </p>
                )}

                {/* Quantity spinner */}
                {isSelected && !fullyRefunded && (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs font-sans text-text-muted">Qty:</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleQuantityChange(item, -1)}
                        disabled={selection.quantityToRefund <= 1}
                        className="w-8 h-8 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-[var(--radius-sm)] border border-border text-text-muted hover:text-text hover:bg-surface transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-base font-bold"
                        aria-label={`Decrease quantity for ${item.product_name}`}
                      >
                        -
                      </button>
                      <span
                        className="min-w-[2rem] text-center text-sm font-mono font-bold text-text tabular-nums"
                        style={{ fontFeatureSettings: "'tnum' 1" }}
                      >
                        {selection.quantityToRefund}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleQuantityChange(item, 1)}
                        disabled={selection.quantityToRefund >= maxQty}
                        className="w-8 h-8 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-[var(--radius-sm)] border border-border text-text-muted hover:text-text hover:bg-surface transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-base font-bold"
                        aria-label={`Increase quantity for ${item.product_name}`}
                      >
                        +
                      </button>
                    </div>
                    <span className="text-xs font-sans text-text-muted">
                      of {maxQty}
                    </span>
                  </div>
                )}
              </div>

              {/* Per-item refund amount */}
              <div className="flex-shrink-0 text-right">
                {isSelected ? (
                  <span
                    className="text-sm font-mono font-bold text-text tabular-nums"
                    style={{ fontFeatureSettings: "'tnum' 1" }}
                  >
                    {formatNZD(selection.refundCents)}
                  </span>
                ) : (
                  <span
                    className="text-sm font-mono text-text-muted tabular-nums"
                    style={{ fontFeatureSettings: "'tnum' 1" }}
                  >
                    {formatNZD(calculateItemRefundCents(item, 1))}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Total refund amount */}
      <div className="flex items-center justify-between px-4 py-3 bg-surface border-t border-border">
        <span className="text-sm font-bold font-sans text-text">Total Refund</span>
        <span
          className="text-base font-mono font-bold text-text tabular-nums"
          style={{ fontFeatureSettings: "'tnum' 1" }}
        >
          {formatNZD(totalRefundCents)}
        </span>
      </div>
    </div>
  )
}
