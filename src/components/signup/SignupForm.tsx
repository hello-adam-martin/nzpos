'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { provisionStore } from '@/actions/auth/provisionStore'
import { slugify } from '@/lib/slugValidation'
import SlugInput from './SlugInput'

type SignupState = {
  error?: Record<string, string[]>
  success?: boolean
  slug?: string
} | null

/**
 * 4-field signup form with slug auto-generation from store name.
 *
 * Flow:
 * 1. Client-side signUp() — creates auth user + sends verification email
 * 2. provisionStore Server Action — creates store, staff, sets app_metadata
 * 3. Redirect to "check your email" screen
 * 4. User clicks verification link → Supabase confirms email → callback creates session
 *
 * Per UI-SPEC Screen 1.
 */
export default function SignupForm() {
  const router = useRouter()
  const [slug, setSlug] = useState('')
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false)
  const [state, setState] = useState<SignupState>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)
    setState(null)

    const form = e.currentTarget
    const formData = new FormData(form)
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const storeName = formData.get('storeName') as string
    const slugValue = formData.get('slug') as string

    // Basic validation
    if (!email || !password || !storeName || !slugValue) {
      setState({ error: { _form: ['Please fill in all fields.'] } })
      setPending(false)
      return
    }
    if (password.length < 8) {
      setState({ error: { password: ['Minimum 8 characters'] } })
      setPending(false)
      return
    }

    // 1. Client-side signUp — creates auth user + sends verification email.
    // emailRedirectTo tells Supabase where the verification link should redirect.
    // We point it to the subdomain's callback so session creation happens there.
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'lvh.me:3000'
    const protocol = rootDomain.includes('lvh.me') || rootDomain.includes('localhost') ? 'http' : 'https'
    const callbackUrl = `${protocol}://${slugValue}.${rootDomain}/api/auth/callback`

    const supabase = createSupabaseBrowserClient()
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: callbackUrl,
      },
    })

    if (authError) {
      const msg = authError.message
      if (msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('already exists')) {
        setState({ error: { email: ['An account already exists for this email.'] } })
      } else {
        setState({ error: { email: [msg] } })
      }
      setPending(false)
      return
    }

    if (!authData.user) {
      setState({ error: { _form: ['Signup failed. Please try again.'] } })
      setPending(false)
      return
    }

    // 2. Server-side provisioning (store creation, app_metadata)
    const provisionData = new FormData()
    provisionData.set('userId', authData.user.id)
    provisionData.set('email', email)
    provisionData.set('storeName', storeName)
    provisionData.set('slug', slugValue)

    const result = await provisionStore(provisionData)

    if (result.error) {
      setState({ error: result.error })
      setPending(false)
      return
    }

    // 3. Redirect to "check your email" screen
    setPending(false)
    router.push(
      `/signup/verify-email?email=${encodeURIComponent(email)}&slug=${encodeURIComponent(slugValue)}&storeName=${encodeURIComponent(storeName)}`
    )
  }

  function handleStoreNameChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (!slugManuallyEdited || slug === '') {
      const generated = slugify(e.target.value)
      setSlug(generated)
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
    <form onSubmit={handleSubmit} className="space-y-4">
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
          onChange={handleStoreNameChange}
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
