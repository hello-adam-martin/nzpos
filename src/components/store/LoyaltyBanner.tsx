'use client'

import { useState, useTransition } from 'react'
import { dismissLoyaltyBanner } from '@/actions/loyalty/getCustomerLoyalty'

interface LoyaltyBannerProps {
  isActive: boolean
  bannerDismissed: boolean
}

/**
 * One-time privacy notice banner for the loyalty points program (D-11, LOYAL-11).
 *
 * Visible when: isActive=true AND bannerDismissed=false
 * Dismissed via the "OK" button which calls dismissLoyaltyBanner server action.
 * Once dismissed, never shown again (backed by loyalty_banner_dismissed_at in DB).
 *
 * Info-tinted design: blue #3B82F6 background tint + border + icon.
 */
export function LoyaltyBanner({ isActive, bannerDismissed: initialDismissed }: LoyaltyBannerProps) {
  const [dismissed, setDismissed] = useState(initialDismissed)
  const [visible, setVisible] = useState(true)
  const [isPending, startTransition] = useTransition()

  // Not active or already dismissed — render nothing
  if (!isActive || dismissed || !visible) {
    return null
  }

  function handleDismiss() {
    startTransition(async () => {
      await dismissLoyaltyBanner()
      // Fade-out then hide
      setVisible(false)
      setDismissed(true)
    })
  }

  return (
    <div
      role="banner"
      aria-live="polite"
      style={{
        opacity: visible ? 1 : 0,
        transition: 'opacity 150ms ease-in',
      }}
      className="mb-4 flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3"
    >
      {/* Info icon */}
      <svg
        className="w-5 h-5 text-blue-500 shrink-0 mt-0.5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-blue-900">
          {"You're now earning loyalty points!"}
        </p>
        <p className="mt-0.5 text-sm text-blue-700">
          We track your purchase history to calculate your reward balance.
        </p>
        <div className="mt-2 flex items-center gap-3">
          <a
            href="/account/loyalty-privacy"
            className="text-xs text-blue-600 underline underline-offset-2 hover:text-blue-800 transition-colors"
          >
            Learn more
          </a>
          <button
            type="button"
            onClick={handleDismiss}
            disabled={isPending}
            aria-label="Dismiss loyalty notice"
            className="text-xs font-semibold text-blue-700 border border-blue-300 rounded px-2 py-0.5 hover:bg-blue-100 transition-colors disabled:opacity-50"
          >
            {isPending ? 'Dismissing...' : 'OK'}
          </button>
        </div>
      </div>
    </div>
  )
}
