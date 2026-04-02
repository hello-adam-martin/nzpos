'use client'

import { resetPassword } from '@/actions/auth/resetPassword'
import { useActionState } from 'react'
import Link from 'next/link'

type ResetState = { error: string } | null

export default function ResetPasswordPage() {
  const [state, formAction, pending] = useActionState(
    async (_prev: ResetState, formData: FormData) => {
      const result = await resetPassword(formData)
      return result ?? null
    },
    null
  )

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] px-6">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow-md border border-[var(--color-border)]">
        <h1 className="font-sans text-2xl font-semibold text-[var(--color-text)] mb-2">
          Reset your password
        </h1>
        <p className="font-sans text-sm text-[var(--color-text-muted)] mb-6">
          {"Enter your email and we'll send a reset link."}
        </p>

        <form action={formAction} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block font-sans text-sm font-semibold text-[var(--color-text)] mb-1"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="w-full h-10 px-3 rounded-md border border-[var(--color-border)] bg-white font-sans text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-light)] focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy/40"
              placeholder="you@example.com"
            />
          </div>

          {state?.error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="font-sans text-sm text-[var(--color-error)]">{state.error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full h-10 rounded-md bg-navy font-sans text-sm font-semibold text-white hover:bg-navy/90 disabled:opacity-50 transition-colors duration-150"
          >
            {pending ? 'Sending...' : 'Send reset link'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <Link
            href="/account/signin"
            className="font-sans text-sm text-[var(--color-navy)] underline hover:no-underline"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    </main>
  )
}
