import AuthCard from '@/components/signup/AuthCard'
import SignupForm from '@/components/signup/SignupForm'

/**
 * Merchant self-serve signup page.
 * Route: /signup
 * Per UI-SPEC Screen 1.
 */
export default function SignupPage() {
  return (
    <AuthCard>
      <h1 className="font-display text-2xl font-semibold text-[var(--color-navy)] mb-1">
        Start your free store
      </h1>
      <p className="font-sans text-sm text-[var(--color-text-muted)] mb-6">
        Your POS and online store, ready in minutes.
      </p>
      <SignupForm />
    </AuthCard>
  )
}
