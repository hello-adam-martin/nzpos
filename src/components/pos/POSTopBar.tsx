'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CashSessionBanner } from '@/components/admin/cash-up/CashSessionBanner'
import { CashUpModal } from '@/components/admin/cash-up/CashUpModal'
import { BarcodeScannerButton } from './BarcodeScannerButton'
import { OrderNotificationBadge } from './OrderNotificationBadge'
import { MuteToggleButton } from './MuteToggleButton'

type POSTopBarProps = {
  storeName: string
  staffName: string
  onLogout: () => void
  activeSession?: { id: string; opened_at: string; opening_float_cents: number } | null
  onScanOpen?: () => void
  scanDisabled?: boolean
  // New for NOTIF-06:
  unreadOrderCount?: number
  isMuted?: boolean
  onToggleMute?: () => void
}

export function POSTopBar({ storeName, staffName, onLogout, activeSession, onScanOpen, scanDisabled = false, unreadOrderCount, isMuted, onToggleMute }: POSTopBarProps) {
  const pathname = usePathname()
  const [isModalOpen, setIsModalOpen] = useState(false)

  function navClass(href: string) {
    const isActive = pathname === href || pathname.startsWith(href + '/')
    return isActive
      ? 'text-white font-bold text-sm transition-colors'
      : 'text-white/60 hover:text-white/90 text-sm transition-colors'
  }

  return (
    <>
      <div className="flex items-center justify-between h-14 px-4 bg-navy shrink-0">
        <div className="flex items-center gap-6">
          <span className="font-display font-bold text-white text-lg">{storeName}</span>
          <nav className="flex items-center gap-4">
            <Link href="/pos" className={navClass('/pos')}>
              POS
            </Link>
            <span className="relative">
              <Link href="/pos/pickups" className={navClass('/pos/pickups')}>
                Pickups
              </Link>
              <OrderNotificationBadge count={unreadOrderCount ?? 0} />
            </span>
          </nav>
          {onScanOpen && (
            <BarcodeScannerButton onScanOpen={onScanOpen} disabled={scanDisabled} />
          )}
        </div>

        {/* Cash session controls */}
        <div className="flex items-center gap-4">
          {activeSession ? (
            <CashSessionBanner
              openedAt={activeSession.opened_at}
              onCloseClick={() => setIsModalOpen(true)}
            />
          ) : (
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="text-white/60 hover:text-white text-sm transition-colors cursor-pointer"
            >
              Open Session
            </button>
          )}

          {onToggleMute && (
            <MuteToggleButton isMuted={isMuted ?? false} onToggle={onToggleMute} />
          )}

          <span className="text-white/20 text-sm">|</span>

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
      </div>

      <CashUpModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentSession={activeSession ?? null}
      />
    </>
  )
}
