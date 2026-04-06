'use client'

import { useState, useTransition } from 'react'
import { saveLoyaltySettings } from '@/actions/loyalty/saveLoyaltySettings'
import type { LoyaltySettings } from '@/actions/loyalty/getLoyaltySettings'

interface Props {
  settings: LoyaltySettings
}

/**
 * LoyaltySettingsCard — admin settings card for earn rate, redeem rate, and pause toggle.
 *
 * Rate display convention (D-07):
 * - earn_rate_cents = 100 → display "1" (1 pt per $1 spent)
 * - redeem_rate_cents = 1  → display "100" (100 pts per $1 discount)
 *
 * Rate storage (integer cents):
 * - user enters N pts/$1 → earn_rate_cents = FLOOR(100 / N)
 * - user enters M pts/$1 off → redeem_rate_cents = FLOOR(100 / M)
 *
 * D-10: Setup gate warning appears when either rate is null.
 * D-15: Single compact card following Store Settings pattern.
 */
export function LoyaltySettingsCard({ settings }: Props) {
  // Convert stored cents to display values
  // earn_rate_cents = 100 → 100/100 = 1 pt per $1
  const initialEarnDisplay =
    settings.earn_rate_cents != null && settings.earn_rate_cents > 0
      ? String(Math.round(100 / settings.earn_rate_cents))
      : ''
  // redeem_rate_cents = 1 → 100/1 = 100 pts per $1 discount
  const initialRedeemDisplay =
    settings.redeem_rate_cents != null && settings.redeem_rate_cents > 0
      ? String(Math.round(100 / settings.redeem_rate_cents))
      : ''

  const [earnDisplay, setEarnDisplay] = useState(initialEarnDisplay)
  const [redeemDisplay, setRedeemDisplay] = useState(initialRedeemDisplay)
  const [isActive, setIsActive] = useState(settings.is_active)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // D-10 setup gate: either rate not yet configured
  const isNotConfigured =
    settings.earn_rate_cents == null || settings.redeem_rate_cents == null

  const handleSave = () => {
    setSuccess(false)
    setError(null)

    const earnPts = parseInt(earnDisplay, 10)
    const redeemPts = parseInt(redeemDisplay, 10)

    if (!earnPts || earnPts <= 0) {
      setError('Points per dollar must be a positive number.')
      return
    }
    if (!redeemPts || redeemPts <= 0) {
      setError('Points per $1 discount must be a positive number.')
      return
    }

    // Convert display values to internal storage (cents)
    const earnRateCents = Math.floor(100 / earnPts)
    const redeemRateCents = Math.floor(100 / redeemPts)

    if (earnRateCents <= 0) {
      setError('Points per dollar value is too large. Please enter a smaller number.')
      return
    }
    if (redeemRateCents <= 0) {
      setError('Points per $1 discount value is too large. Please enter a smaller number.')
      return
    }

    startTransition(async () => {
      const result = await saveLoyaltySettings({
        earn_rate_cents: earnRateCents,
        redeem_rate_cents: redeemRateCents,
        is_active: isActive,
      })
      if ('error' in result) {
        setError(result.error)
      } else {
        setSuccess(true)
      }
    })
  }

  return (
    <div className="max-w-md w-full bg-white border border-[var(--color-border)] shadow-sm rounded-[var(--radius-lg)] p-[var(--space-xl)]">
      {/* D-10 setup gate warning — shown when rates are not yet configured */}
      {isNotConfigured && (
        <div
          className="mb-[var(--space-lg)] rounded-md border border-[#D97706] p-[var(--space-md)]"
          style={{ backgroundColor: 'rgba(217, 119, 6, 0.1)' }}
          role="alert"
        >
          <p className="font-sans text-sm text-[#D97706]">
            Set up earn and redeem rates to activate loyalty points. Points will not accumulate
            until both rates are saved.
          </p>
        </div>
      )}

      {/* Earn rate input */}
      <div className="mb-[var(--space-md)]">
        <label
          htmlFor="earn-rate"
          className="block font-sans text-sm font-normal text-[var(--color-text)] mb-[var(--space-xs)]"
        >
          Points per dollar
        </label>
        <input
          id="earn-rate"
          type="number"
          min={1}
          step={1}
          value={earnDisplay}
          onChange={(e) => {
            setEarnDisplay(e.target.value)
            setSuccess(false)
          }}
          placeholder="e.g. 1"
          className="w-full h-10 px-3 rounded-md border border-[var(--color-border)] bg-white text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-light)] focus:outline-none focus:ring-2 focus:ring-[var(--color-navy)]/20 focus:border-[var(--color-navy)]/40 transition-colors duration-150"
        />
        <p className="mt-[var(--space-xs)] font-sans text-xs text-[var(--color-text-muted)]">
          How many points a customer earns per $1 spent
        </p>
      </div>

      {/* Redeem rate input */}
      <div className="mb-[var(--space-md)]">
        <label
          htmlFor="redeem-rate"
          className="block font-sans text-sm font-normal text-[var(--color-text)] mb-[var(--space-xs)]"
        >
          Points per $1 discount
        </label>
        <input
          id="redeem-rate"
          type="number"
          min={1}
          step={1}
          value={redeemDisplay}
          onChange={(e) => {
            setRedeemDisplay(e.target.value)
            setSuccess(false)
          }}
          placeholder="e.g. 100"
          className="w-full h-10 px-3 rounded-md border border-[var(--color-border)] bg-white text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-light)] focus:outline-none focus:ring-2 focus:ring-[var(--color-navy)]/20 focus:border-[var(--color-navy)]/40 transition-colors duration-150"
        />
        <p className="mt-[var(--space-xs)] font-sans text-xs text-[var(--color-text-muted)]">
          How many points needed for $1 off
        </p>
      </div>

      {/* Pause earning toggle (D-15) */}
      <div className="mb-[var(--space-lg)] flex items-center gap-[var(--space-sm)]">
        <input
          id="pause-earning"
          type="checkbox"
          checked={!isActive}
          onChange={(e) => {
            setIsActive(!e.target.checked)
            setSuccess(false)
          }}
          className="h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-amber)] focus:ring-[var(--color-amber)]"
        />
        <label
          htmlFor="pause-earning"
          className="font-sans text-sm font-normal text-[var(--color-text)] cursor-pointer"
        >
          Pause earning &amp; redemption
        </label>
      </div>

      {/* Error message */}
      {error && (
        <p
          className="mb-[var(--space-sm)] font-sans text-sm text-[var(--color-error)]"
          role="alert"
        >
          {error}
        </p>
      )}

      {/* Success message */}
      {success && (
        <p
          className="mb-[var(--space-sm)] font-sans text-sm text-[var(--color-success)]"
          role="status"
        >
          Settings saved.
        </p>
      )}

      {/* Save Settings button (copywriting contract) */}
      <button
        type="button"
        onClick={handleSave}
        disabled={isPending}
        className="w-full min-h-[44px] rounded-md bg-[var(--color-amber)] text-white font-sans font-bold text-sm transition-colors duration-150 hover:bg-[var(--color-amber-hover)] disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isPending ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  )
}
