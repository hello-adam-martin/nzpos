import Link from 'next/link'
import ResendButton from './ResendButton'

interface VerifyEmailPageProps {
  searchParams: Promise<{ email?: string; type?: string }>
}

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const { email = '', type } = await searchParams
  const isReset = type === 'reset'

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--color-bg)] px-6">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow-md border border-[var(--color-border)]">
        {/* Envelope icon */}
        <div className="mb-4 flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-surface)]">
            <svg
              className="h-6 w-6 text-[var(--color-navy)]"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.75}
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
        </div>

        <h1 className="font-sans text-2xl font-semibold text-[var(--color-text)] mb-2 text-center">
          Check your email
        </h1>

        <p className="font-sans text-sm text-[var(--color-text-muted)] mb-6 text-center">
          {isReset
            ? `We've sent a password reset link to ${email || 'your email address'}.`
            : `We've sent a verification link to ${email || 'your email address'}.`}
        </p>

        {!isReset && email && (
          <div className="mb-4">
            <ResendButton email={email} />
          </div>
        )}

        <div className="text-center">
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
