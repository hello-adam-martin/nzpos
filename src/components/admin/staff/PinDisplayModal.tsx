'use client'
import { useState } from 'react'

interface PinDisplayModalProps {
  pin: string
  onDone: () => void
}

export default function PinDisplayModal({ pin, onDone }: PinDisplayModalProps) {
  const [copied, setCopied] = useState(false)
  const [clipboardUnavailable, setClipboardUnavailable] = useState(false)

  async function handleCopyPin() {
    if (!navigator.clipboard) {
      setClipboardUnavailable(true)
      return
    }
    try {
      await navigator.clipboard.writeText(pin)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setClipboardUnavailable(true)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div
        className="bg-card rounded-[var(--radius-lg)] shadow-lg w-full max-w-[400px] overflow-hidden"
        style={{ animation: 'modalOpen 250ms ease-out' }}
      >
        {/* Header — no close X, must use Done */}
        <div className="px-6 pt-6 pb-0">
          <h2 className="text-xl font-semibold font-sans text-text">Save this PIN</h2>
        </div>

        {/* Body */}
        <div className="px-6 py-6 flex flex-col items-center gap-5">
          {/* PIN display */}
          <div className="bg-surface rounded-[var(--radius-md)] px-8 py-4 w-full flex justify-center">
            <span
              className="text-4xl font-semibold font-sans text-navy tracking-widest"
              style={{ fontFeatureSettings: "'tnum' 1" }}
            >
              {pin}
            </span>
          </div>

          {/* Copy button */}
          {clipboardUnavailable ? (
            <p className="text-sm font-sans text-text-muted text-center">
              Select and copy the PIN above manually.
            </p>
          ) : (
            <button
              type="button"
              onClick={handleCopyPin}
              className="w-full h-11 bg-amber text-white text-sm font-semibold font-sans rounded-[var(--radius-md)] hover:bg-amber-hover transition-colors"
            >
              {copied ? 'Copied!' : 'Copy PIN'}
            </button>
          )}

          {/* Warning */}
          <div className="flex items-start gap-2 w-full">
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              className="flex-shrink-0 mt-0.5 text-error"
            >
              <path
                d="M8 1.5L1 13.5h14L8 1.5z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              <path d="M8 6v3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="8" cy="11.5" r="0.5" fill="currentColor" stroke="currentColor" strokeWidth="0.5" />
            </svg>
            <p className="text-sm font-sans text-error">
              Store this PIN somewhere safe — it won&apos;t be shown again.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <button
            type="button"
            onClick={onDone}
            className="w-full h-11 border border-navy text-navy text-sm font-semibold font-sans rounded-[var(--radius-md)] hover:bg-navy/5 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
