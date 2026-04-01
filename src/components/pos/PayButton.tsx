'use client'

import { formatNZD } from '@/lib/money'

type PayButtonProps = {
  totalCents: number
  disabled: boolean
  onClick: () => void
}

export function PayButton({ totalCents, disabled, onClick }: PayButtonProps) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      aria-disabled={disabled}
      className={[
        'w-full min-h-[56px] bg-amber text-white text-base font-bold rounded-lg transition-opacity',
        disabled ? 'opacity-50 pointer-events-none' : 'hover:bg-amber-hover active:scale-[0.98]',
      ].join(' ')}
    >
      Charge {formatNZD(totalCents)}
    </button>
  )
}
