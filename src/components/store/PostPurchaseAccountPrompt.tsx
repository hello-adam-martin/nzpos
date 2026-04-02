'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

type Props = {
  email: string
  orderId: string
  token: string
  isGuest: boolean
}

const DISMISS_KEY = 'dismissed_account_prompt'

export function PostPurchaseAccountPrompt({ email, orderId, token, isGuest }: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Only show if guest and not previously dismissed
    if (!isGuest) return
    try {
      const dismissed = localStorage.getItem(DISMISS_KEY)
      if (!dismissed) {
        setVisible(true)
      }
    } catch {
      // localStorage unavailable (e.g., private browsing restrictions)
      setVisible(true)
    }
  }, [isGuest])

  function handleDismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, 'true')
    } catch {
      // ignore
    }
    setVisible(false)
  }

  if (!visible) return null

  const returnTo = `/order/${orderId}?token=${token}`
  const signupHref = `/account/signup?email=${encodeURIComponent(email)}&return_to=${encodeURIComponent(returnTo)}`

  return (
    <div className="rounded-lg p-4 bg-surface border border-border mb-6">
      <h2 className="text-base font-semibold text-text">Track this order</h2>
      <p className="text-sm text-text-muted mt-1">
        Create an account to view your order history and get updates.
      </p>

      <div className="mt-3 flex items-center gap-3 flex-wrap">
        <Link
          href={signupHref}
          className="inline-flex items-center justify-center h-10 px-4 rounded-md text-white text-sm font-semibold transition-colors duration-150"
          style={{ backgroundColor: 'var(--color-amber, #E67E22)' }}
        >
          Create account
        </Link>

        <button
          type="button"
          onClick={handleDismiss}
          className="text-sm text-text-muted underline hover:text-text transition-colors duration-150"
        >
          No thanks
        </button>
      </div>
    </div>
  )
}
