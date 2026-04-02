'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { AccountDropdown } from './AccountDropdown'

type Props = {
  user: { name?: string | null; email: string; emailVerified: boolean } | null
}

export function AccountMenuButton({ user }: Props) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close on click outside
  useEffect(() => {
    if (!open) return

    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  if (!user) {
    return (
      <Link
        href="/account/signin"
        className="text-sm font-semibold text-navy hover:text-navy/80 transition-colors duration-150 shrink-0"
      >
        Sign in
      </Link>
    )
  }

  const displayName = user.name || user.email

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={`Account, ${displayName}`}
        aria-expanded={open}
        aria-haspopup="menu"
        className="h-10 w-10 flex items-center justify-center rounded-md text-navy hover:bg-navy/5 transition-colors duration-150"
      >
        {/* UserCircle icon — heroicons style, strokeWidth 1.75 */}
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
            d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
          />
        </svg>
      </button>

      {open && <AccountDropdown onClose={() => setOpen(false)} />}
    </div>
  )
}
