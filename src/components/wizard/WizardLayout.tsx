import React from 'react'

/**
 * WizardLayout — minimal chrome for the setup wizard.
 * No admin sidebar. Full viewport, centered card content.
 * Warm stone background matches design system.
 */
export function WizardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col">
      {/* Minimal wordmark header */}
      <div className="shrink-0 h-14 flex items-center px-6">
        <span
          className="font-display font-bold text-[20px] leading-none text-[var(--color-navy)]"
          style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 700 }}
        >
          NZPOS
        </span>
      </div>

      {/* Centered content area */}
      <div className="flex-1 flex items-center justify-center px-4 py-[var(--space-xl)]">
        {children}
      </div>
    </div>
  )
}
