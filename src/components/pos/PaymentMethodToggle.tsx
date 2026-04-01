'use client'

type PaymentMethodToggleProps = {
  selected: 'eftpos' | 'cash' | null
  onSelect: (method: 'eftpos' | 'cash') => void
}

export function PaymentMethodToggle({ selected, onSelect }: PaymentMethodToggleProps) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => onSelect('eftpos')}
        aria-pressed={selected === 'eftpos'}
        className={[
          'flex-1 min-h-[44px] rounded-full text-sm font-bold text-center transition-colors',
          selected === 'eftpos'
            ? 'bg-navy text-white'
            : 'bg-card text-navy border border-border hover:bg-surface',
        ].join(' ')}
      >
        EFTPOS
      </button>

      <button
        type="button"
        onClick={() => onSelect('cash')}
        aria-pressed={selected === 'cash'}
        className={[
          'flex-1 min-h-[44px] rounded-full text-sm font-bold text-center transition-colors',
          selected === 'cash'
            ? 'bg-navy text-white'
            : 'bg-card text-navy border border-border hover:bg-surface',
        ].join(' ')}
      >
        Cash
      </button>
    </div>
  )
}
