'use client'
import { useEffect, useRef, useState } from 'react'
import type { SubscriptionFeature } from '@/config/addons'

interface AddOnCardProps {
  feature: SubscriptionFeature
  name: string
  benefitLine: string
  status: 'active' | 'trial' | 'inactive'
  trialDaysLeft?: number
  activeSince?: string  // ISO date string
  trialEndsAt?: string  // ISO date string
  priceDisplay?: string // e.g. "$15/month" — fetched from parent, NOT hardcoded
  onSubscribe: (feature: string) => void
  onManage: () => void
  subscribing?: boolean
  highlight?: boolean  // For ?upgrade= scroll-to highlight
}

function FeatureIcon({ feature, muted }: { feature: string; muted?: boolean }) {
  const colorClass = muted ? 'text-[var(--color-text-light)]' : 'text-[var(--color-navy)]'
  if (feature === 'xero') {
    // Chart/accounting icon
    return (
      <svg
        className={`w-6 h-6 ${colorClass}`}
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth="1.5"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z"
        />
      </svg>
    )
  }
  if (feature === 'email_notifications') {
    // Envelope icon
    return (
      <svg
        className={`w-6 h-6 ${colorClass}`}
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth="1.5"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
        />
      </svg>
    )
  }
  // custom_domain: globe icon
  return (
    <svg
      className={`w-6 h-6 ${colorClass}`}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth="1.5"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418"
      />
    </svg>
  )
}

function Spinner() {
  return (
    <svg
      className="animate-spin w-4 h-4 text-white inline-block"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  )
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-NZ', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

export function AddOnCard({
  feature,
  name,
  benefitLine,
  status,
  trialDaysLeft,
  activeSince,
  trialEndsAt,
  priceDisplay,
  onSubscribe,
  onManage,
  subscribing = false,
  highlight = false,
}: AddOnCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [showRing, setShowRing] = useState(highlight)

  useEffect(() => {
    if (highlight && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setShowRing(true)
      const timer = setTimeout(() => setShowRing(false), 2000)
      return () => clearTimeout(timer)
    }
  }, [highlight])

  const cardBase =
    'bg-card border border-[var(--color-border)] rounded-[var(--radius-lg)] p-6 shadow-sm transition-shadow duration-150'
  const ringClass = showRing ? ' ring-2 ring-[var(--color-amber)] ring-offset-2' : ''

  return (
    <div ref={cardRef} className={cardBase + ringClass}>
      {/* Header row: icon + name + badge */}
      <div className="flex items-center gap-3 mb-3">
        <FeatureIcon feature={feature} muted={status === 'inactive'} />
        <span className="text-lg font-semibold font-sans text-[var(--color-text)] flex-1">
          {name}
        </span>
        {status === 'active' && (
          <span className="bg-[#ECFDF5] text-[#059669] text-xs font-semibold px-2 py-0.5 rounded-full">
            Active
          </span>
        )}
        {status === 'trial' && (
          <span className="bg-[#FFFBEB] text-[#D97706] text-xs font-semibold px-2 py-0.5 rounded-full">
            Trial &mdash; {trialDaysLeft ?? 0} days left
          </span>
        )}
      </div>

      {/* Benefit line */}
      <p className="text-sm font-sans text-[var(--color-text-muted)] mb-4">{benefitLine}</p>

      {/* Status-specific footer */}
      {(status === 'active' || status === 'trial') && (
        <div className="flex items-center justify-between">
          <span className="text-sm font-sans text-[var(--color-text-muted)]">
            {status === 'active' && activeSince
              ? `Active since ${formatDate(activeSince)}`
              : status === 'trial' && trialEndsAt
              ? `Trial ends ${formatDate(trialEndsAt)}`
              : null}
          </span>
          <button
            type="button"
            onClick={onManage}
            className="text-sm font-sans text-[var(--color-navy)] hover:underline"
          >
            Manage billing
          </button>
        </div>
      )}

      {status === 'inactive' && (
        <div className="space-y-3">
          {priceDisplay && (
            <p className="text-sm font-semibold font-sans text-[var(--color-text)]">
              14-day free trial, then {priceDisplay}/month
            </p>
          )}
          <button
            type="button"
            onClick={() => onSubscribe(feature)}
            disabled={subscribing}
            className="bg-[var(--color-amber)] text-white text-sm font-semibold w-full py-2 rounded-[var(--radius-md)] hover:opacity-90 transition-opacity duration-150 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {subscribing ? (
              <Spinner />
            ) : priceDisplay ? (
              'Start free trial'
            ) : (
              `Subscribe to ${name}`
            )}
          </button>
        </div>
      )}
    </div>
  )
}
