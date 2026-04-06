'use client'

type PaymentMethodToggleProps = {
  selected: 'eftpos' | 'cash' | 'gift_card' | null
  onSelect: (method: 'eftpos' | 'cash' | 'gift_card') => void
  showGiftCard?: boolean  // only show when store has gift cards enabled
}

export function PaymentMethodToggle({ selected, onSelect, showGiftCard }: PaymentMethodToggleProps) {
  const buttonClass = (method: 'eftpos' | 'cash' | 'gift_card') => [
    'flex-1 min-h-[44px] rounded-full text-sm font-bold text-center transition-colors',
    selected === method
      ? 'bg-navy text-white'
      : 'bg-card text-navy border border-border hover:bg-surface',
  ].join(' ')

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => onSelect('eftpos')}
        aria-pressed={selected === 'eftpos'}
        className={buttonClass('eftpos')}
      >
        EFTPOS
      </button>

      <button
        type="button"
        onClick={() => onSelect('cash')}
        aria-pressed={selected === 'cash'}
        className={buttonClass('cash')}
      >
        Cash
      </button>

      {showGiftCard && (
        <button
          type="button"
          onClick={() => onSelect('gift_card')}
          aria-pressed={selected === 'gift_card'}
          className={buttonClass('gift_card')}
        >
          Gift Card
        </button>
      )}
    </div>
  )
}
