'use client'
import { useEffect, useState } from 'react'
import { parsePriceToCents } from '@/lib/money'

interface PriceInputProps {
  initialCents?: number
  onPriceChange: (cents: number | null) => void
  error?: string
  disabled?: boolean
}

export default function PriceInput({
  initialCents,
  onPriceChange,
  error,
  disabled = false,
}: PriceInputProps) {
  const [rawValue, setRawValue] = useState(() => {
    if (initialCents !== undefined && initialCents !== null) {
      const dollars = Math.floor(initialCents / 100)
      const cents = initialCents % 100
      return `${dollars}.${String(cents).padStart(2, '0')}`
    }
    return ''
  })

  // Sync when initialCents changes (edit mode)
  useEffect(() => {
    if (initialCents !== undefined && initialCents !== null) {
      const dollars = Math.floor(initialCents / 100)
      const cents = initialCents % 100
      setRawValue(`${dollars}.${String(cents).padStart(2, '0')}`)
    }
  }, [initialCents])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setRawValue(val)
    const parsed = parsePriceToCents(val)
    onPriceChange(parsed)
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-semibold font-sans text-text">Price</label>
      <div className="flex items-center gap-0">
        <span className="px-3 py-2 text-sm font-mono text-text-muted bg-surface border border-r-0 border-border rounded-l-[var(--radius-md)] select-none">
          NZD $
        </span>
        <input
          type="text"
          inputMode="decimal"
          pattern="[0-9]*\.?[0-9]{0,2}"
          value={rawValue}
          onChange={handleChange}
          disabled={disabled}
          placeholder="0.00"
          className={[
            'flex-1 px-3 py-2 text-sm font-mono bg-card text-text border border-border rounded-r-[var(--radius-md)]',
            'focus:outline-none focus:ring-2 focus:ring-navy focus:border-navy transition-colors',
            'disabled:bg-surface disabled:text-text-muted disabled:cursor-not-allowed',
            error ? 'border-error focus:ring-error' : '',
          ].join(' ')}
          aria-label="Price in NZD dollars"
          style={{ fontFeatureSettings: "'tnum' 1" }}
        />
      </div>
      {error && (
        <p className="text-sm font-sans text-error">{error}</p>
      )}
    </div>
  )
}
