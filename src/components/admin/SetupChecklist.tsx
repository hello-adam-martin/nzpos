'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { ChecklistState } from '@/lib/setupChecklist'

interface Props {
  state: ChecklistState
}

const CHECKLIST_ITEMS = [
  { key: 'storeName' as const, label: 'Set your store name' },
  { key: 'logo' as const, label: 'Upload your logo' },
  { key: 'firstProduct' as const, label: 'Add your first product' },
  { key: 'firstPosSale' as const, label: 'Complete your first POS sale' },
  { key: 'firstOnlineOrder' as const, label: 'Receive your first online order' },
]

/**
 * SetupChecklist — dashboard banner tracking 5 activation milestones.
 *
 * Render rules:
 * - dismissed && !allComplete  → show progress banner
 * - dismissed && allComplete   → show congratulations, then auto-collapse after 3s
 * - !dismissed                 → render nothing (wizard handles this phase)
 */
export function SetupChecklist({ state }: Props) {
  const [collapsed, setCollapsed] = useState(false)

  // After congratulations fades out, collapse the banner completely
  useEffect(() => {
    if (state.allComplete && state.dismissed) {
      const timer = setTimeout(() => {
        setCollapsed(true)
      }, 3400) // 3s display + 400ms fade
      return () => clearTimeout(timer)
    }
  }, [state.allComplete, state.dismissed])

  // Do not render while wizard is active
  if (!state.dismissed) return null

  // Banner fully collapsed after animation
  if (collapsed) return null

  // All-complete congratulations state
  if (state.allComplete) {
    return (
      <div
        className="bg-white border border-[var(--color-border)] shadow-sm rounded-lg p-[var(--space-lg)] text-center mb-[var(--space-lg)]"
        style={{
          animation: 'checklistFadeOut 400ms ease-out 3s forwards',
        }}
      >
        <style>{`
          @keyframes checklistFadeOut {
            from { opacity: 1; max-height: 200px; }
            to { opacity: 0; max-height: 0; overflow: hidden; padding: 0; margin: 0; }
          }
        `}</style>
        <p className="font-sans font-bold text-xl text-[var(--color-text)]">
          Your store is set up.
        </p>
        <p className="font-sans text-base text-[var(--color-text-muted)] mt-1">
          {"You're all set — everything is ready to go."}
        </p>
      </div>
    )
  }

  // Progress banner
  return (
    <div className="bg-white border border-[var(--color-border)] shadow-sm rounded-lg p-[var(--space-lg)] mb-[var(--space-lg)]">
      {/* Top row: fraction label + progress bar + resume link */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-[var(--space-sm)] mb-[var(--space-md)]">
        {/* Fraction label */}
        <p className="font-sans font-bold text-xl text-[var(--color-text)] shrink-0">
          {state.completedCount} of 5 steps complete
        </p>

        {/* Progress bar */}
        <div className="flex-1">
          <div
            className="h-2 rounded-full bg-[var(--color-surface)] overflow-hidden"
            role="progressbar"
            aria-valuenow={state.completedCount}
            aria-valuemin={0}
            aria-valuemax={5}
            aria-label="Setup progress"
          >
            <div
              className="h-full rounded-full bg-[var(--color-amber)] transition-all duration-300"
              style={{ width: `${(state.completedCount / 5) * 100}%` }}
            />
          </div>
        </div>

        {/* Resume link */}
        <Link
          href="/admin/setup"
          className="font-sans text-sm text-[var(--color-navy)] hover:underline shrink-0"
        >
          Resume setup
        </Link>
      </div>

      {/* Checklist items */}
      <ul className="space-y-[var(--space-sm)]">
        {CHECKLIST_ITEMS.map(({ key, label }) => {
          const isComplete = state[key]
          return (
            <li
              key={key}
              className="flex items-center gap-[var(--space-sm)]"
              aria-label={isComplete ? `${label} — complete` : label}
            >
              {isComplete ? (
                /* Filled checkmark circle */
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-5 h-5 shrink-0 text-[var(--color-success)]"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                /* Circle outline */
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 20 20"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-5 h-5 shrink-0 text-[var(--color-border)]"
                  aria-hidden="true"
                >
                  <circle cx="10" cy="10" r="8.25" />
                </svg>
              )}

              <span
                className={[
                  'font-sans text-sm',
                  isComplete
                    ? 'text-[var(--color-text-muted)] line-through'
                    : 'text-[var(--color-text)]',
                ].join(' ')}
              >
                {label}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
