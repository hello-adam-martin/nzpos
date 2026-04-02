'use client'

import { customerSignin } from '@/actions/auth/customerSignin'
import { useActionState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

type SigninState = { error: string } | null

function SigninForm() {
  const searchParams = useSearchParams()
  const returnTo = searchParams.get('return_to') ?? ''

  const [state, formAction, pending] = useActionState(
    async (_prev: SigninState, formData: FormData) => {
      const result = await customerSignin(formData)
      return result ?? null
    },
    null
  )

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] px-6">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow-md border border-[var(--color-border)]">
        <h1 className="font-sans text-2xl font-semibold text-[var(--color-text)] mb-6">
          Sign in
        </h1>

        <form action={formAction} className="space-y-4">
          {returnTo && (
            <input type="hidden" name="return_to" value={returnTo} />
          )}

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
              autoComplete="current-password"
              required
              className="w-full h-10 px-3 rounded-md border border-[var(--color-border)] bg-white font-sans text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-light)] focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy/40"
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
            {pending ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="mt-4 space-y-2 text-center">
          <p className="font-sans text-sm text-[var(--color-text-muted)]">
            {"Don't have an account? "}
            <Link href="/account/signup" className="text-[var(--color-navy)] underline hover:no-underline">
              Create account
            </Link>
          </p>
          <p className="font-sans text-sm text-[var(--color-text-muted)]">
            <Link href="/account/reset-password" className="text-[var(--color-navy)] underline hover:no-underline">
              Forgot password? Reset password
            </Link>
          </p>
        </div>
      </div>
    </main>
  )
}

export default function SigninPage() {
  return (
    <Suspense fallback={null}>
      <SigninForm />
    </Suspense>
  )
}
