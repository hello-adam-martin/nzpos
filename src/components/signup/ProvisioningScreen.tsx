'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useActionState } from 'react'
import { retryProvisioning } from '@/actions/auth/retryProvisioning'
import ProvisioningStepList from './ProvisioningStepList'

interface ProvisioningScreenProps {
  slug?: string
  storeName?: string
  status?: string
}

type RetryState = {
  success?: boolean
  slug?: string
  error?: string
} | null

/**
 * Provisioning loading/success/failure screen.
 * On mount: animates through 3 steps then redirects to store admin dashboard.
 * If status=failed: shows error state with retry button.
 * Per UI-SPEC Screen 2 + Screen 4.
 */
export default function ProvisioningScreen({ slug, storeName, status }: ProvisioningScreenProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [showRedirecting, setShowRedirecting] = useState(false)
  const [failed, setFailed] = useState(status === 'failed' || !slug)
  const [retryError, setRetryError] = useState<string>('')

  const [retryState, retryAction, retryPending] = useActionState(
    async (_prev: RetryState, formData: FormData): Promise<RetryState> => {
      const result = await retryProvisioning(formData)
      return result
    },
    null
  )

  // Handle retry success — animate through steps and redirect
  useEffect(() => {
    if (retryState?.success && retryState.slug) {
      setFailed(false)
      setCurrentStep(1)
      animateSteps(retryState.slug)
    } else if (retryState?.error) {
      setRetryError(retryState.error)
    }
  }, [retryState])

  function animateSteps(targetSlug: string) {
    // Step 1
    setTimeout(() => setCurrentStep(1), 0)
    // Step 2
    setTimeout(() => setCurrentStep(2), 500)
    // Step 3
    setTimeout(() => setCurrentStep(3), 1000)
    // All complete
    setTimeout(() => {
      setCurrentStep(4)
      setShowRedirecting(true)
    }, 1500)
    // Redirect
    setTimeout(() => {
      const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'lvh.me:3000'
      const protocol =
        rootDomain.includes('lvh.me') || rootDomain.includes('localhost') ? 'http' : 'https'
      router.push(`${protocol}://${targetSlug}.${rootDomain}/admin/dashboard`)
    }, 1750)
  }

  // On mount with a valid slug, start the animation
  useEffect(() => {
    if (!slug || status === 'failed') {
      setFailed(true)
      return
    }

    animateSteps(slug)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Failure state
  if (failed && !retryState?.success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)]">
        <div className="w-full max-w-sm px-4 text-center">
          {/* NZPOS brand mark */}
          <p className="font-display text-3xl font-semibold text-[var(--color-navy)] mb-8">
            NZPOS
          </p>

          {/* Error icon */}
          <div className="flex justify-center mb-4">
            <svg
              className="w-12 h-12 text-[var(--color-error)]"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-1.72 6.97a.75.75 0 10-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 101.06 1.06L12 13.06l1.72 1.72a.75.75 0 101.06-1.06L13.06 12l1.72-1.72a.75.75 0 10-1.06-1.06L12 10.94l-1.72-1.72z"
                clipRule="evenodd"
              />
            </svg>
          </div>

          {/* Heading */}
          <h1 className="font-display text-2xl font-semibold text-[var(--color-navy)] mb-2">
            Something went wrong
          </h1>

          {/* Body */}
          <p className="font-sans text-base text-[var(--color-text)] leading-relaxed mb-6">
            We couldn&apos;t finish setting up your store. Your account has been created — just retry below.
          </p>

          {/* Step list in failed state */}
          <div className="text-left mb-6">
            <ProvisioningStepList currentStep={2} failed={true} />
          </div>

          {/* Retry error */}
          {retryError && (
            <p className="mb-4 font-sans text-sm text-[var(--color-error)]">{retryError}</p>
          )}

          {/* Retry form */}
          <form action={retryAction}>
            <input type="hidden" name="storeName" value={storeName ?? ''} />
            <input type="hidden" name="slug" value={slug ?? ''} />
            <button
              type="submit"
              disabled={retryPending}
              className="w-full rounded-md bg-[var(--color-navy)] px-4 font-sans text-sm font-semibold text-white min-h-[44px] hover:bg-[var(--color-navy-light)] disabled:opacity-50 transition-colors duration-150"
            >
              {retryPending ? 'Retrying...' : 'Retry provisioning'}
            </button>
          </form>

          {/* Contact support */}
          <p className="mt-2 font-sans text-sm text-[var(--color-text-muted)]">
            <a href="mailto:support@nzpos.co.nz" className="hover:underline">
              Contact support
            </a>
          </p>
        </div>
      </div>
    )
  }

  // Loading / success state
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-bg)]">
      <div className="w-full max-w-sm px-4">
        {/* NZPOS brand mark */}
        <p className="font-display text-3xl font-semibold text-[var(--color-navy)] text-center">
          NZPOS
        </p>

        {/* Heading */}
        <h1 className="font-display text-2xl font-semibold text-[var(--color-navy)] text-center mt-8">
          Setting up your store
        </h1>

        {/* Sub-heading */}
        <p className="font-sans text-sm text-[var(--color-text-muted)] text-center mt-2">
          This takes about 10 seconds.
        </p>

        {/* Step list */}
        <ProvisioningStepList currentStep={currentStep} failed={false} />

        {/* Redirecting text — fades in after all steps complete */}
        {showRedirecting && (
          <p className="mt-6 font-sans text-sm text-[var(--color-text-muted)] text-center animate-fade-in">
            Redirecting to your dashboard...
          </p>
        )}
      </div>
    </div>
  )
}
