'use client'

import { ownerSignin } from '@/actions/auth/ownerSignin'
import { useActionState } from 'react'

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(
    async (_prev: { error: string } | null, formData: FormData) => {
      const result = await ownerSignin(formData)
      return result ?? null
    },
    null
  )

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--color-bg)]">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow-md border border-[var(--color-border)]">
        <h1 className="font-display text-2xl font-bold text-[var(--color-navy)] mb-2">
          NZPOS
        </h1>
        <p className="font-sans text-sm text-[var(--color-text-muted)] mb-6">
          Sign in to your admin dashboard
        </p>

        <form action={formAction} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block font-sans text-sm font-bold text-[var(--color-text)] mb-1"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 font-sans text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-light)] focus:border-[var(--color-navy)] focus:outline-none focus:ring-1 focus:ring-[var(--color-navy)]"
              placeholder="owner@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block font-sans text-sm font-bold text-[var(--color-text)] mb-1"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 font-sans text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-light)] focus:border-[var(--color-navy)] focus:outline-none focus:ring-1 focus:ring-[var(--color-navy)]"
            />
          </div>

          {state?.error && (
            <p className="font-sans text-sm text-[var(--color-error)]">{state.error}</p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-md bg-navy px-4 py-2.5 font-sans text-sm font-bold text-white hover:bg-navy-light disabled:opacity-50 transition-colors duration-150"
          >
            {pending ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </main>
  )
}
