'use client'

interface Props {
  currentStep: 1 | 2 | 3
  completedSteps: number[]
}

/**
 * WizardStepIndicator — 3-dot step indicator with active/completed/pending states.
 * Active: amber fill. Completed: navy fill + checkmark. Pending: border-only.
 * Connected by thin lines that fill navy when both sides are complete.
 */
export function WizardStepIndicator({ currentStep, completedSteps }: Props) {
  const steps = [1, 2, 3] as const

  return (
    <div className="flex items-center justify-center mb-[var(--space-lg)]" aria-label="Wizard progress">
      {steps.map((step, index) => {
        const isActive = step === currentStep
        const isCompleted = completedSteps.includes(step)
        const isLast = index === steps.length - 1

        // Connecting line fills navy if this step AND next step are both complete/active
        const nextStep = steps[index + 1]
        const lineComplete = isCompleted && (completedSteps.includes(nextStep) || nextStep === currentStep)

        return (
          <div key={step} className="flex items-center">
            {/* Step circle */}
            <div
              className={[
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors duration-150',
                isCompleted
                  ? 'bg-[var(--color-navy)] text-white'
                  : isActive
                  ? 'bg-[var(--color-amber)] text-white'
                  : 'border border-[var(--color-border)] text-[var(--color-text-muted)] bg-white',
              ].join(' ')}
              aria-label={`Step ${step} of 3`}
              aria-current={isActive ? 'step' : undefined}
            >
              {isCompleted ? (
                /* Checkmark SVG */
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-4 h-4"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                step
              )}
            </div>

            {/* Connecting line (not after last step) */}
            {!isLast && (
              <div
                className={[
                  'h-[2px] w-12 transition-colors duration-150',
                  lineComplete ? 'bg-[var(--color-navy)]' : 'bg-[var(--color-border)]',
                ].join(' ')}
                aria-hidden="true"
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
