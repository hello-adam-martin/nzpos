'use client'

import { useReducer } from 'react'

type Denomination = {
  label: string
  valueCents: number
}

const DENOMINATIONS: Denomination[] = [
  { label: '$100', valueCents: 10000 },
  { label: '$50', valueCents: 5000 },
  { label: '$20', valueCents: 2000 },
  { label: '$10', valueCents: 1000 },
  { label: '$5', valueCents: 500 },
  { label: '$2', valueCents: 200 },
  { label: '$1', valueCents: 100 },
  { label: '$0.50', valueCents: 50 },
  { label: '$0.20', valueCents: 20 },
  { label: '$0.10', valueCents: 10 },
]

type State = { counts: Record<number, number>; expanded: boolean }
type Action =
  | { type: 'SET_COUNT'; valueCents: number; count: number }
  | { type: 'TOGGLE' }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_COUNT': {
      const counts = { ...state.counts, [action.valueCents]: action.count }
      return { ...state, counts }
    }
    case 'TOGGLE':
      return { ...state, expanded: !state.expanded }
  }
}

interface DenominationBreakdownProps {
  onTotalChange: (totalCents: number) => void
}

export function DenominationBreakdown({ onTotalChange }: DenominationBreakdownProps) {
  const [state, dispatch] = useReducer(reducer, { counts: {}, expanded: false })

  function handleChange(valueCents: number, raw: string) {
    const count = Math.max(0, parseInt(raw, 10) || 0)
    dispatch({ type: 'SET_COUNT', valueCents, count })
    // Recalculate total with updated count
    const newCounts = { ...state.counts, [valueCents]: count }
    const total = DENOMINATIONS.reduce(
      (sum, d) => sum + (newCounts[d.valueCents] ?? 0) * d.valueCents,
      0
    )
    onTotalChange(total)
  }

  return (
    <div className="border border-[var(--color-border)] rounded-md">
      <button
        type="button"
        onClick={() => dispatch({ type: 'TOGGLE' })}
        className="w-full flex items-center justify-between px-md py-sm text-sm font-bold text-[var(--color-text)] cursor-pointer"
      >
        <span>Enter by denomination</span>
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className={`transition-transform ${state.expanded ? 'rotate-180' : ''}`}
        >
          <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {state.expanded && (
        <div className="px-md pb-md border-t border-[var(--color-border)]">
          <div className="grid grid-cols-2 gap-sm pt-sm">
            {DENOMINATIONS.map((d) => (
              <div
                key={d.valueCents}
                className="flex items-center gap-sm"
                style={{ minHeight: '44px' }}
              >
                <label className="text-sm font-bold text-[var(--color-text)] w-12 shrink-0">
                  {d.label}
                </label>
                <input
                  type="number"
                  min="0"
                  value={state.counts[d.valueCents] ?? ''}
                  onChange={(e) => handleChange(d.valueCents, e.target.value)}
                  placeholder="0"
                  className="w-full border border-[var(--color-border)] rounded-sm px-sm py-xs text-sm font-normal text-[var(--color-text)] focus:outline-none focus:border-[var(--color-navy)]"
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
