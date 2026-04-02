'use client'

import Link from 'next/link'
import { customerSignOut } from '@/actions/auth/customerSignOut'

type Props = {
  onClose: () => void
}

export function AccountDropdown({ onClose }: Props) {
  return (
    <div
      className="absolute right-0 top-full mt-2 w-[180px] rounded-lg border border-border bg-card shadow-md z-50"
      role="menu"
      style={{
        animation: 'dropdown-in 150ms ease-out forwards',
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose()
      }}
    >
      <style>{`
        @keyframes dropdown-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>

      <Link
        href="/account/orders"
        role="menuitem"
        onClick={onClose}
        className="h-10 px-4 flex items-center text-sm text-text hover:bg-surface transition-colors duration-150 rounded-t-lg"
      >
        My Orders
      </Link>

      <Link
        href="/account/profile"
        role="menuitem"
        onClick={onClose}
        className="h-10 px-4 flex items-center text-sm text-text hover:bg-surface transition-colors duration-150"
      >
        My Profile
      </Link>

      <div className="border-t border-border my-1" />

      <form action={customerSignOut}>
        <button
          type="submit"
          role="menuitem"
          className="h-10 w-full px-4 flex items-center text-sm text-text hover:bg-surface transition-colors duration-150 rounded-b-lg text-left"
        >
          Sign out
        </button>
      </form>
    </div>
  )
}
