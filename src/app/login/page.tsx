'use client'

import { ownerSignin } from '@/actions/auth/ownerSignin'
import { useActionState } from 'react'
import AuthCard from '@/components/signup/AuthCard'

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(
    async (_prev: { error: string } | null, formData: FormData) => {
      const result = await ownerSignin(formData)
      return result ?? null
    },
    null
  )

  return (
    <AuthCard>
      <h1 className="font-display text-2xl font-semibold text-[var(--color-navy)] mb-1">
        Welcome back
      </h1>
      <p className="font-sans text-sm text-[var(--color-text-muted)] mb-6">
        Sign in to your admin dashboard
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
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white px-3 py-2 font-sans text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-light)] focus:border-[var(--color-navy)] focus:outline-none focus:ring-1 focus:ring-[var(--color-navy)]"
            placeholder="owner@example.com"
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
            className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-white px-3 py-2 font-sans text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-light)] focus:border-[var(--color-navy)] focus:outline-none focus:ring-1 focus:ring-[var(--color-navy)]"
          />
        </div>

        {state?.error && (
          <p className="font-sans text-sm text-[var(--color-error)]">{state.error}</p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-[var(--radius-md)] bg-[var(--color-amber)] px-4 min-h-[44px] font-sans text-sm font-semibold text-white hover:bg-[var(--color-amber-hover)] disabled:opacity-50 transition-colors duration-150"
        >
          {pending ? 'Signing in...' : 'Sign in'}
        </button>
      </form>

      <p className="mt-6 text-center font-sans text-sm text-[var(--color-text-muted)]">
        Don&apos;t have an account?{' '}
        <a
          href="/signup"
          className="text-[var(--color-navy)] font-semibold underline hover:text-[var(--color-navy-light)]"
        >
          Get started free
        </a>
      </p>
    </AuthCard>
  )
}
