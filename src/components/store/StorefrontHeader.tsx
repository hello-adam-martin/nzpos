'use client'

import { useCallback, useRef } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCart } from '@/contexts/CartContext'

export function StorefrontHeader() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { itemCount, dispatch } = useCart()

  // Debounce search input (300ms)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        const params = new URLSearchParams(searchParams.toString())
        if (value) {
          params.set('q', value)
        } else {
          params.delete('q')
        }
        router.push(`?${params.toString()}`)
      }, 300)
    },
    [router, searchParams]
  )

  const handleCartClick = useCallback(() => {
    dispatch({ type: 'OPEN_DRAWER' })
  }, [dispatch])

  return (
    <header className="h-16 sticky top-0 z-50 bg-surface border-b border-border">
      <div className="mx-auto max-w-[1200px] h-full px-6 lg:px-8 flex items-center gap-4">
        {/* Store name — Display role: Satoshi, xl, semibold */}
        <Link
          href="/"
          className="font-display text-xl font-semibold text-navy shrink-0 hover:opacity-80 transition-opacity duration-150"
        >
          NZPOS
        </Link>

        {/* Search input — center/right, full-width on mobile, max-w-md on desktop */}
        <div className="flex-1 flex justify-center">
          <input
            type="search"
            placeholder="Search products..."
            defaultValue={searchParams.get('q') ?? ''}
            onChange={handleSearchChange}
            className="w-full max-w-md h-9 px-3 rounded-md border border-border bg-card text-sm text-text placeholder:text-text-light focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy/40 transition-colors duration-150"
            aria-label="Search products"
          />
        </div>

        {/* Cart icon with item count badge */}
        <button
          onClick={handleCartClick}
          aria-label={`Cart, ${itemCount} items`}
          className="relative shrink-0 h-10 w-10 flex items-center justify-center rounded-md text-navy hover:bg-navy/5 transition-colors duration-150"
          type="button"
        >
          {/* Shopping bag SVG */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.75}
            stroke="currentColor"
            className="w-6 h-6"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007Z"
            />
          </svg>

          {/* Badge — amber circle with white count; hidden when 0 */}
          {itemCount > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-amber text-white text-xs font-semibold leading-none tabular-nums"
              aria-hidden="true"
            >
              {itemCount > 99 ? '99+' : itemCount}
            </span>
          )}
        </button>
      </div>
    </header>
  )
}
