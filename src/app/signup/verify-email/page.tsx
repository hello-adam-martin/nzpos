import AuthCard from '@/components/signup/AuthCard'
import VerifyEmailCard from '@/components/signup/VerifyEmailCard'

interface VerifyEmailPageProps {
  searchParams: Promise<{ email?: string }>
}

/**
 * Email verification gate page.
 * Route: /signup/verify-email
 * Middleware redirects unverified users hitting /admin to this page.
 * Per UI-SPEC Screen 3.
 */
export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const params = await searchParams
  const email = params.email ?? ''

  return (
    <AuthCard>
      <p className="font-display text-3xl font-semibold text-[var(--color-navy)] mb-6 text-center">
        NZPOS
      </p>
      <VerifyEmailCard email={email} />
    </AuthCard>
  )
}
