'use client'

import { customerSignup } from '@/actions/auth/customerSignup'
import { useActionState } from 'react'
import Link from 'next/link'

type SignupState = { error: string; existingUser?: boolean } | null

export default function SignupPage() {
  const [state, formAction, pending] = useActionState(
    async (_prev: SignupState, formData: FormData) => {
      const result = await customerSignup(formData)
      return result ?? null
    },
    null
  )

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] px-6">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow-md border border-[var(--color-border)]">
        <h1 className="font-sans text-2xl font-semibold text-[var(--color-text)] mb-6">
          Create account
        </h1>

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

          <div>
            <label
              htmlFor="password"
              className="block font-sans text-sm font-semibold text-[var(--color-text)] mb-1"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              className="w-full h-10 px-3 rounded-md border border-[var(--color-border)] bg-white font-sans text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-light)] focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy/40"
            />
            <p className="mt-1 font-sans text-xs text-[var(--color-text-muted)]">
              Must be at least 8 characters.
            </p>
          </div>

          {state?.error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="font-sans text-sm text-[var(--color-error)]">
                {state.error}
                {state.existingUser && (
                  <>
                    {' '}
                    <Link href="/account/signin" className="underline hover:no-underline">
                      Sign in instead
                    </Link>
                  </>
                )}
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full h-10 rounded-md bg-amber font-sans text-sm font-semibold text-white hover:bg-amber/90 disabled:opacity-50 transition-colors duration-150"
          >
            {pending ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <p className="font-sans text-sm text-[var(--color-text-muted)]">
            Already have an account?{' '}
            <Link href="/account/signin" className="text-[var(--color-navy)] underline hover:no-underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}
