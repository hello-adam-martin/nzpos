'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { resendVerification } from '@/actions/auth/resendVerification'

interface VerifyEmailCardProps {
  email: string
}

type ResendStatus = 'idle' | 'sending' | 'sent' | 'rate-limited'

const COOLDOWN_SECONDS = 30

/**
 * Email verification gate card with resend button and 30-second cooldown.
 * Per UI-SPEC Screen 3.
 */
export default function VerifyEmailCard({ email }: VerifyEmailCardProps) {
  const [resendStatus, setResendStatus] = useState<ResendStatus>('idle')
  const [cooldownRemaining, setCooldownRemaining] = useState(0)
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [isPending, startTransition] = useTransition()

  function startCooldown() {
    setCooldownRemaining(COOLDOWN_SECONDS)
    cooldownRef.current = setInterval(() => {
      setCooldownRemaining((prev) => {
        if (prev <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  async function handleResend() {
    setResendStatus('sending')
    startTransition(async () => {
      const formData = new FormData()
      formData.append('email', email)
      const result = await resendVerification(formData)
      if (result?.success) {
        setResendStatus('sent')
        startCooldown()
      } else if (result?.error) {
        if (
          result.error.toLowerCase().includes('wait') ||
          result.error.toLowerCase().includes('rate')
        ) {
          setResendStatus('rate-limited')
        } else {
          setResendStatus('idle')
        }
      }
    })
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current)
    }
  }, [])

  const isDisabled = resendStatus === 'sending' || isPending || cooldownRemaining > 0

  return (
    <div className="text-center">
      {/* Envelope icon */}
      <div className="flex justify-center mb-4">
        <svg
          className="w-12 h-12 text-[var(--color-navy)]"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M1.5 8.67v8.58a3 3 0 003 3h15a3 3 0 003-3V8.67l-8.928 5.493a3 3 0 01-3.144 0L1.5 8.67z" />
          <path d="M22.5 6.908V6.75a3 3 0 00-3-3h-15a3 3 0 00-3 3v.158l9.714 5.978a1.5 1.5 0 001.572 0L22.5 6.908z" />
        </svg>
      </div>

      {/* Heading */}
      <h2 className="font-display text-2xl font-semibold text-[var(--color-navy)]">
        Check your email
      </h2>

      {/* Body */}
      <p className="font-sans text-base text-[var(--color-text)] leading-relaxed mt-2">
        We sent a verification link to{' '}
        <span className="font-semibold">{email}</span>. Click it to activate your store.
      </p>

      {/* Resend button */}
      <div className="mt-6">
        <button
          type="button"
          onClick={handleResend}
          disabled={isDisabled}
          aria-label={
            cooldownRemaining > 0
              ? `Resend verification email — wait ${cooldownRemaining} seconds`
              : 'Resend verification email'
          }
          className="w-full rounded-md border border-[var(--color-border)] bg-white px-4 font-sans text-sm font-semibold text-[var(--color-navy)] min-h-[44px] hover:bg-[var(--color-surface)] disabled:opacity-50 transition-colors duration-150 flex items-center justify-center gap-2"
        >
          {(resendStatus === 'sending' || isPending) && resendStatus !== 'sent' && (
            <>
              <svg
                className="animate-spin h-4 w-4"
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
              Sending...
            </>
          )}
          {resendStatus === 'sent' && (
            <>
              <svg
                className="h-4 w-4 text-[var(--color-success)]"
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
              Email sent — check your inbox
            </>
          )}
          {resendStatus !== 'sending' && resendStatus !== 'sent' && !isPending && (
            <>
              {cooldownRemaining > 0
                ? `Resend verification email (${cooldownRemaining}s)`
                : 'Resend verification email'}
            </>
          )}
        </button>
      </div>

      {/* Rate-limited message */}
      {resendStatus === 'rate-limited' && (
        <p className="mt-2 font-sans text-sm text-[var(--color-text-muted)]">
          Please wait before requesting another email.
        </p>
      )}

      {/* Wrong email link */}
      <p className="mt-2 font-sans text-sm text-[var(--color-text-muted)]">
        <a href="/signup" className="hover:underline">
          Wrong email? Sign out
        </a>
      </p>
    </div>
  )
}
