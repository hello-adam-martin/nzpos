'use client'

import { useState, useEffect } from 'react'

interface CashSessionBannerProps {
  openedAt: string
  onCloseClick: () => void
}

function formatElapsed(openedAt: string): string {
  const diffMs = Date.now() - new Date(openedAt).getTime()
  const totalMinutes = Math.floor(diffMs / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours === 0) return `${minutes}m`
  if (minutes === 0) return `${hours}h`
  return `${hours}h ${minutes}m`
}

export function CashSessionBanner({ openedAt, onCloseClick }: CashSessionBannerProps) {
  const [elapsed, setElapsed] = useState(() => formatElapsed(openedAt))

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(formatElapsed(openedAt))
    }, 60000)
    return () => clearInterval(interval)
  }, [openedAt])

  return (
    <div className="flex items-center gap-sm text-sm text-white/80">
      <span>Session open &middot; {elapsed}</span>
      <button
        type="button"
        onClick={onCloseClick}
        className="text-white/60 hover:text-white text-sm transition-colors cursor-pointer"
      >
        Close
      </button>
    </div>
  )
}
