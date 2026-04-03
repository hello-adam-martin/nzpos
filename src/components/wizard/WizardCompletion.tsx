'use client'

import { WizardStepCard } from './WizardStepCard'

/**
 * WizardCompletion — success state after completing all 3 wizard steps.
 * Fades in on mount. Auto-redirect is handled by the parent SetupWizard component.
 */
export function WizardCompletion() {
  return (
    <div
      style={{
        animation: 'wizardFadeIn 250ms ease-out both',
      }}
    >
      <style>{`
        @keyframes wizardFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>

      <WizardStepCard title="">
        <div className="flex flex-col items-center text-center py-[var(--space-md)]">
          {/* Checkmark icon */}
          <div className="mb-[var(--space-lg)]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-12 h-12 text-[var(--color-success)]"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z"
                clipRule="evenodd"
              />
            </svg>
          </div>

          <h2 className="font-sans font-bold text-xl text-[var(--color-text)] mb-[var(--space-sm)]">
            Your store is ready.
          </h2>

          <p className="font-sans text-base text-[var(--color-text-muted)] mb-[var(--space-lg)]">
            You can update all of these details anytime from your dashboard.
          </p>

          <p className="font-sans text-sm text-[var(--color-text-light)]">
            Taking you there...
          </p>
        </div>
      </WizardStepCard>
    </div>
  )
}
