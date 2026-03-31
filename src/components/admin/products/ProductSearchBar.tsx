'use client'
import { useRef, useState } from 'react'

interface ProductSearchBarProps {
  onSearchChange: (query: string) => void
}

export default function ProductSearchBar({ onSearchChange }: ProductSearchBarProps) {
  const [value, setValue] = useState('')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value
    setValue(raw)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      onSearchChange(raw)
    }, 300)
  }

  function handleClear() {
    setValue('')
    if (timerRef.current) clearTimeout(timerRef.current)
    onSearchChange('')
  }

  return (
    <div className="relative">
      {/* Search icon */}
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
          />
        </svg>
      </span>

      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder="Search by name or SKU"
        className="w-full pl-9 pr-9 py-2 text-base font-sans border border-border rounded-[var(--radius-md)] bg-card text-text placeholder-text-light focus:outline-none focus:ring-2 focus:ring-navy focus:border-navy transition-colors"
        aria-label="Search products by name or SKU"
      />

      {/* Clear button */}
      {value && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text transition-colors"
          aria-label="Clear search"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
}
