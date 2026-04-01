'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

type POSTopBarProps = {
  storeName: string
  staffName: string
  onLogout: () => void
}

export function POSTopBar({ storeName, staffName, onLogout }: POSTopBarProps) {
  const pathname = usePathname()

  function navClass(href: string) {
    const isActive = pathname === href || pathname.startsWith(href + '/')
    return isActive
      ? 'text-white font-semibold text-sm transition-colors'
      : 'text-white/60 hover:text-white/90 text-sm transition-colors'
  }

  return (
    <div className="flex items-center justify-between h-14 px-4 bg-navy shrink-0">
      <div className="flex items-center gap-6">
        <span className="font-display font-bold text-white text-lg">{storeName}</span>
        <nav className="flex items-center gap-4">
          <Link href="/pos" className={navClass('/pos')}>
            POS
          </Link>
          <Link href="/pos/pickups" className={navClass('/pos/pickups')}>
            Pickups
          </Link>
        </nav>
      </div>
      <div className="flex items-center gap-3">
        <span className="font-sans text-white/70 text-sm">{staffName}</span>
        <button
          onClick={onLogout}
          className="text-white/50 hover:text-white text-sm transition-colors cursor-pointer"
        >
          Logout
        </button>
      </div>
    </div>
  )
}
