'use client'

import { resendVerification } from '@/actions/auth/resendVerification'
import { useState, useTransition } from 'react'

interface ResendButtonProps {
  email: string
}

export default function ResendButton({ email }: ResendButtonProps) {
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [cooldown, setCooldown] = useState(false)

  function handleResend() {
    setError(null)
    startTransition(async () => {
      const formData = new FormData()
      formData.set('email', email)
      const result = await resendVerification(formData)
      if (result?.error) {
        setError(result.error)
      } else {
        setSent(true)
        setCooldown(true)
        setTimeout(() => {
          setCooldown(false)
          setSent(false)
        }, 30000)
      }
    })
  }

  return (
    <div className="text-center">
      {sent ? (
        <p className="font-sans text-sm text-[var(--color-success)]">Sent! Check your inbox.</p>
      ) : (
        <button
          onClick={handleResend}
          disabled={isPending || cooldown}
          className="font-sans text-sm text-[var(--color-navy)] underline hover:no-underline disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? 'Sending...' : 'Resend verification email'}
        </button>
      )}
      {error && (
        <p className="mt-1 font-sans text-xs text-[var(--color-error)]">{error}</p>
      )}
    </div>
  )
}
