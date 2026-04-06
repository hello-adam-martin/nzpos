'use client'

import { useCallback, useRef } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCart } from '@/contexts/CartContext'
import { AccountMenuButton } from './AccountMenuButton'

type CustomerInfo = {
  name?: string | null
  email: string
  emailVerified: boolean
}

type BrandingInfo = {
  storeName: string | null
  logoUrl: string | null
  primaryColor: string | null
}

type Props = {
  customer?: CustomerInfo | null
  branding?: BrandingInfo | null
  hasGiftCards?: boolean
}

/**
 * Compute relative luminance from hex color to decide text color.
 * Returns true if the background is dark (use white text).
 */
function isDarkColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance < 0.5
}

export function StorefrontHeader({ customer, branding, hasGiftCards }: Props) {
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

  // Branding-derived values
  const primaryColor = branding?.primaryColor ?? null
  const logoUrl = branding?.logoUrl ?? null
  const storeName = branding?.storeName ?? null
  const useDarkBg = primaryColor ? isDarkColor(primaryColor) : false

  const headerBg = primaryColor ?? 'var(--color-surface)'
  const textColorClass = useDarkBg ? 'text-white' : 'text-navy'
  const iconColorClass = useDarkBg ? 'text-white' : 'text-navy'
  const searchBorderClass = useDarkBg
    ? 'border-white/20 focus:border-white/40 focus:ring-white/20'
    : 'border-border focus:border-navy/40 focus:ring-navy/20'

  return (
    <header
      className="h-16 sticky top-0 z-50 border-b border-border"
      style={{ backgroundColor: headerBg }}
    >
      <div className="mx-auto max-w-[1200px] h-full px-6 lg:px-8 flex items-center gap-4">
        {/* Store identity — logo if available, else store name, else fallback */}
        <Link
          href="/"
          className={`shrink-0 hover:opacity-80 transition-opacity duration-150 ${textColorClass}`}
          aria-label={storeName ?? 'Store home'}
        >
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={storeName ?? 'Store logo'}
              className="h-8 object-contain"
            />
          ) : (
            <span className="font-display text-xl font-semibold">
              {storeName ?? 'NZPOS'}
            </span>
          )}
        </Link>

        {/* Gift Cards nav link — only when store has gift cards enabled (D-10) */}
        {hasGiftCards && (
          <Link
            href="/gift-cards"
            className={`shrink-0 text-sm font-medium transition-opacity duration-150 hover:opacity-80 ${textColorClass}`}
          >
            Gift Cards
          </Link>
        )}

        {/* Search input */}
        <div className="flex-1 flex justify-center">
          <input
            type="search"
            placeholder="Search products..."
            defaultValue={searchParams.get('q') ?? ''}
            onChange={handleSearchChange}
            className={`w-full max-w-md h-9 px-3 rounded-md border bg-card text-sm text-text placeholder:text-text-light focus:outline-none focus:ring-2 transition-colors duration-150 ${searchBorderClass}`}
            aria-label="Search products"
          />
        </div>

        {/* Cart icon with item count badge */}
        <button
          onClick={handleCartClick}
          aria-label={`Cart, ${itemCount} items`}
          className={`relative shrink-0 h-10 w-10 flex items-center justify-center rounded-md transition-colors duration-150 ${iconColorClass} hover:bg-current/5`}
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

          {/* Badge */}
          {itemCount > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-amber text-white text-xs font-semibold leading-none tabular-nums"
              aria-hidden="true"
            >
              {itemCount > 99 ? '99+' : itemCount}
            </span>
          )}
        </button>

        {/* Account icon / Sign in link */}
        <AccountMenuButton user={customer ?? null} />
      </div>
    </header>
  )
}
