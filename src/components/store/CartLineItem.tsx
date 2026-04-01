'use client'

import Image from 'next/image'
import { type StoreCartItem } from '@/contexts/CartContext'
import { formatNZD } from '@/lib/money'

interface CartLineItemProps {
  item: StoreCartItem
  onQuantityChange: (qty: number) => void
  onRemove: () => void
}

export function CartLineItem({
  item,
  onQuantityChange,
  onRemove,
}: CartLineItemProps) {
  const lineTotal = item.unitPriceCents * item.quantity

  return (
    <div className="flex items-start gap-3 py-3 border-b border-[var(--color-border-light)] last:border-0">
      {/* Thumbnail */}
      <div className="shrink-0 w-12 h-12 rounded-md overflow-hidden bg-[var(--color-surface)] border border-[var(--color-border)]">
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={item.productName}
            width={48}
            height={48}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg
              className="w-5 h-5 text-[var(--color-text-light)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Name + stepper */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--color-text)] leading-snug truncate">
          {item.productName}
        </p>

        {/* Quantity stepper */}
        <div className="flex items-center gap-2 mt-2">
          <button
            type="button"
            onClick={() => onQuantityChange(item.quantity - 1)}
            disabled={item.quantity <= 1}
            aria-label="Decrease quantity"
            className="w-7 h-7 flex items-center justify-center rounded border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-100"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>

          <span className="w-6 text-center text-sm font-medium tabular-nums text-[var(--color-text)]">
            {item.quantity}
          </span>

          <button
            type="button"
            onClick={() => onQuantityChange(item.quantity + 1)}
            disabled={item.quantity >= item.maxStock}
            aria-label="Increase quantity"
            className="w-7 h-7 flex items-center justify-center rounded border border-[var(--color-border)] text-[var(--color-text-muted)] hover:bg-[var(--color-surface)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-100"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Price + remove */}
      <div className="flex flex-col items-end gap-2 shrink-0">
        <span className="text-sm font-semibold tabular-nums text-[var(--color-text)]">
          {formatNZD(lineTotal)}
        </span>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${item.productName} from cart`}
          className="text-[var(--color-error)] hover:opacity-75 transition-opacity duration-100"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}
