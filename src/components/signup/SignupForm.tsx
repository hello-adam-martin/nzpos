'use client'

import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ownerSignup } from '@/actions/auth/ownerSignup'
import { slugify } from '@/lib/slugValidation'
import SlugInput from './SlugInput'

type SignupState = {
  error?: Record<string, string[]>
  success?: boolean
  slug?: string
} | null

/**
 * 4-field signup form with slug auto-generation from store name.
 * Calls ownerSignup Server Action and navigates to /signup/provisioning on success.
 * Per UI-SPEC Screen 1.
 */
export default function SignupForm() {
  const router = useRouter()
  const [slug, setSlug] = useState('')
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)

  const [state, formAction, pending] = useActionState(
    async (_prev: SignupState, formData: FormData): Promise<SignupState> => {
      const result = await ownerSignup(formData)
      return result
    },
    null
  )

  // Navigate to provisioning page on success
  useEffect(() => {
    if (state?.success && state.slug) {
      router.push(`/signup/provisioning?slug=${encodeURIComponent(state.slug)}`)
    }
  }, [state, router])

  function handleStoreNameBlur(e: React.FocusEvent<HTMLInputElement>) {
    if (!slugManuallyEdited || slug === '') {
      const generated = slugify(e.target.value)
      if (generated) {
        setSlug(generated)
      }
    }
  }

  function handleSlugChange(newSlug: string) {
    setSlug(newSlug)
    setSlugManuallyEdited(true)
  }

  const inputClass =
    'w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 font-sans text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-light)] focus:border-[var(--color-navy)] focus:outline-none focus:ring-1 focus:ring-[var(--color-navy)]'
  const labelClass = 'block font-sans text-sm font-semibold text-[var(--color-text)] mb-1'

  return (
    <form action={formAction} className="space-y-4">
      {/* Email */}
      <div>
        <label htmlFor="email" className={labelClass}>
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className={inputClass}
          placeholder="owner@example.com"
          aria-describedby={state?.error?.email ? 'email-error' : undefined}
        />
        {state?.error?.email && (
          <p id="email-error" className="mt-1 font-sans text-sm text-[var(--color-error)]">
            {state.error.email[0]}
          </p>
        )}
      </div>

      {/* Password */}
      <div>
        <label htmlFor="password" className={labelClass}>
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          className={inputClass}
          aria-describedby={state?.error?.password ? 'password-error' : 'password-hint'}
        />
        {!state?.error?.password && (
          <p id="password-hint" className="mt-1 font-sans text-sm text-[var(--color-text-muted)]">
            Minimum 8 characters
          </p>
        )}
        {state?.error?.password && (
          <p id="password-error" className="mt-1 font-sans text-sm text-[var(--color-error)]">
            {state.error.password[0]}
          </p>
        )}
      </div>

      {/* Store Name */}
      <div>
        <label htmlFor="storeName" className={labelClass}>
          Store Name
        </label>
        <input
          id="storeName"
          name="storeName"
          type="text"
          autoComplete="organization"
          required
          className={inputClass}
          placeholder="My Supply Store"
          onBlur={handleStoreNameBlur}
          aria-describedby={state?.error?.storeName ? 'storeName-error' : undefined}
        />
        {state?.error?.storeName && (
          <p id="storeName-error" className="mt-1 font-sans text-sm text-[var(--color-error)]">
            {state.error.storeName[0]}
          </p>
        )}
      </div>

      {/* Slug input */}
      <SlugInput
        value={slug}
        onChange={handleSlugChange}
        error={state?.error?.slug?.[0]}
      />

      {/* Form-level error */}
      {state?.error?._form && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-[var(--color-error)] bg-red-50 px-3 py-2"
        >
          <svg
            className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--color-error)]"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <p className="font-sans text-sm text-[var(--color-error)]">
            {state.error._form[0]}
          </p>
        </div>
      )}

      {/* Submit button */}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-[var(--color-amber)] px-4 font-sans text-sm font-semibold text-white min-h-[44px] hover:bg-[var(--color-amber-hover)] disabled:opacity-50 transition-colors duration-150 flex items-center justify-center gap-2"
      >
        {pending ? (
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
            Creating your store...
          </>
        ) : (
          'Create my store'
        )}
      </button>

      {/* Footer link */}
      <p className="text-center font-sans text-sm text-[var(--color-text-muted)]">
        Already have an account?{' '}
        <a
          href="/login"
          className="text-[var(--color-navy)] underline hover:text-[var(--color-navy-light)]"
        >
          Sign in
        </a>
      </p>
    </form>
  )
}
