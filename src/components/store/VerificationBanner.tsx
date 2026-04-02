'use client'

import { useState, useTransition } from 'react'
import { resendVerification } from '@/actions/auth/resendVerification'

type Props = {
  email: string
}

export function VerificationBanner({ email }: Props) {
  const [sent, setSent] = useState(false)
  const [disabled, setDisabled] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleResend() {
    if (disabled) return

    startTransition(async () => {
      const formData = new FormData()
      formData.set('email', email)
      await resendVerification(formData)
      setSent(true)
      setDisabled(true)

      // Re-enable button after 30 seconds
      setTimeout(() => {
        setDisabled(false)
        setSent(false)
      }, 30_000)
    })
  }

  return (
    <div
      role="alert"
      className="w-full py-2 px-6 text-center"
      style={{
        backgroundColor: '#EFF6FF',
        borderBottom: '1px solid #BFDBFE',
      }}
    >
      <p className="text-sm" style={{ color: '#1D4ED8' }}>
        Please verify your email address.{' '}
        {sent ? (
          <span>Verification email sent. Check your inbox.</span>
        ) : (
          <button
            type="button"
            onClick={handleResend}
            disabled={disabled || isPending}
            className="underline hover:opacity-80 transition-opacity duration-150 disabled:opacity-50"
            style={{ color: '#1D4ED8' }}
          >
            Resend email
          </button>
        )}
      </p>
    </div>
  )
}
