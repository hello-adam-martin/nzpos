'use client'

import { formatNZD } from '@/lib/money'

interface ComparisonStatCardProps {
  label: string
  subLabel: string
  valueCents: number
  previousCents: number
}

function UpArrowIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4.5 19.5l7.5-7.5 7.5 7.5" />
    </svg>
  )
}

function DownArrowIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19.5 4.5l-7.5 7.5-7.5-7.5" />
    </svg>
  )
}

export function ComparisonStatCard({
  label,
  subLabel,
  valueCents,
  previousCents,
}: ComparisonStatCardProps) {
  const delta =
    previousCents === 0
      ? null
      : Math.round(((valueCents - previousCents) / previousCents) * 100)

  return (
    <div className="bg-card border border-[var(--color-border)] shadow-sm rounded-[var(--radius-lg)] p-[var(--space-xl)] min-h-[96px]">
      <p className="text-sm text-[var(--color-text-muted)] mb-1">{subLabel}</p>
      <p className="text-sm text-[var(--color-text-muted)] mb-1">{label}</p>
      <p
        className="font-display font-bold text-3xl text-[var(--color-navy)] mb-2"
        style={{ fontFeatureSettings: "'tnum' 1" }}
      >
        {formatNZD(valueCents)}
      </p>

      {delta === null ? (
        <span className="text-sm text-[var(--color-text-muted)]">—</span>
      ) : delta > 0 ? (
        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-sm font-bold bg-[var(--color-success)]/10 text-[var(--color-success)]">
          <UpArrowIcon />
          +{delta}%
        </span>
      ) : delta < 0 ? (
        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-sm font-bold bg-[var(--color-warning)]/10 text-[var(--color-warning)]">
          <DownArrowIcon />
          {delta}%
        </span>
      ) : (
        <span className="text-sm text-[var(--color-text-muted)]">—</span>
      )}
    </div>
  )
}
