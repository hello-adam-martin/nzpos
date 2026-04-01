'use client'

import { useEffect, useRef } from 'react'
import { formatNZD } from '@/lib/money'

type EftposConfirmScreenProps = {
  totalCents: number
  onConfirm: () => void
  onVoid: () => void
}

export function EftposConfirmScreen({ totalCents, onConfirm, onVoid }: EftposConfirmScreenProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Focus trap on mount
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    container.focus()

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab') return
      const focusable = container!.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (!first || !last) return

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div
      ref={containerRef}
      role="alertdialog"
      aria-modal="true"
      aria-label="EFTPOS payment confirmation"
      tabIndex={-1}
      className="fixed inset-0 z-50 bg-navy flex flex-col items-center justify-center px-4 animate-[fadeIn_150ms_ease-out] outline-none"
    >
      {/* Amount display */}
      <div className="flex flex-col items-center mb-2">
        <p className="text-sm text-white/60 font-normal mb-1">NZD</p>
        <p className="text-3xl font-display font-bold text-white tabular-nums">
          {formatNZD(totalCents)}
        </p>
      </div>

      {/* Instruction */}
      <h1 className="text-xl font-bold text-white mt-8 text-center">
        Did the EFTPOS terminal show APPROVED?
      </h1>
      <p className="text-sm text-white/60 mt-2 text-center">
        Check the terminal screen before confirming.
      </p>

      {/* Action buttons */}
      <div className="flex gap-4 w-full max-w-lg mt-12">
        <button
          onClick={onConfirm}
          className="flex-1 min-h-[56px] bg-success text-white text-base font-bold rounded-lg hover:opacity-90 transition-opacity"
        >
          YES — Sale Complete
        </button>
        <button
          onClick={onVoid}
          className="flex-1 min-h-[56px] bg-error text-white text-base font-bold rounded-lg hover:opacity-90 transition-opacity"
        >
          NO — Void Sale
        </button>
      </div>
    </div>
  )
}
