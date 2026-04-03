'use client'

interface ProvisioningStepListProps {
  currentStep: number // 0 = not started, 1-3 = active step index, >3 = all complete
  failed: boolean
}

const STEPS = [
  'Creating your account',
  'Provisioning your store',
  'Preparing your dashboard',
]

/**
 * Animated 3-step progress list for provisioning screen.
 * Per UI-SPEC Screen 2.
 */
export default function ProvisioningStepList({ currentStep, failed }: ProvisioningStepListProps) {
  return (
    <ol role="list" className="flex flex-col gap-4 mt-6">
      {STEPS.map((step, index) => {
        const stepNumber = index + 1
        const isComplete = currentStep > stepNumber
        const isActive = currentStep === stepNumber
        const isPending = currentStep < stepNumber

        return (
          <li
            key={step}
            role="listitem"
            aria-current={isActive ? 'step' : undefined}
            className="flex items-center gap-3 transition-all duration-150 ease-out"
          >
            {/* Step indicator circle */}
            <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
              {isComplete && (
                <div className="w-5 h-5 rounded-full bg-[var(--color-success)] flex items-center justify-center">
                  <svg
                    className="w-3 h-3 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              )}
              {isActive && !failed && (
                <svg
                  className="animate-spin w-5 h-5 text-[var(--color-navy)]"
                  style={{ animationDuration: '800ms' }}
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
              )}
              {isActive && failed && (
                <div className="w-5 h-5 rounded-full border-2 border-[var(--color-error)]" />
              )}
              {isPending && (
                <div className="w-5 h-5 rounded-full border-2 border-[var(--color-border)]" />
              )}
            </div>

            {/* Step label */}
            <span
              className={`font-sans text-sm transition-all duration-150 ease-out ${
                isActive
                  ? 'font-semibold text-[var(--color-text)]'
                  : 'font-normal text-[var(--color-text-muted)]'
              }`}
            >
              {step}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
