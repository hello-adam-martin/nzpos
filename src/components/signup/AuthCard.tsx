import React from 'react'
import Link from 'next/link'

interface AuthCardProps {
  children: React.ReactNode
}

/**
 * Reusable layout shell for auth pages (login, signup, verify-email).
 * Navy header with NZPOS wordmark matching the marketing site.
 * Card centered on warm stone background.
 */
export default function AuthCard({ children }: AuthCardProps) {
  return (
    <main className="flex min-h-screen flex-col bg-[var(--color-bg)]">
      {/* Navy header matching marketing site */}
      <header className="bg-[var(--color-navy)] px-[var(--space-md)] md:px-[var(--space-lg)] py-[var(--space-sm)]">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="font-display font-bold text-xl text-white tracking-tight"
            aria-label="NZPOS home"
          >
            NZPOS
          </Link>
        </div>
      </header>

      {/* Card centered below */}
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm rounded-[var(--radius-lg)] bg-card p-8 shadow-md border border-[var(--color-border)]">
          {children}
        </div>
      </div>

      {/* Minimal footer */}
      <footer className="py-4 text-center">
        <p className="font-sans text-xs text-[var(--color-text-muted)]">
          &copy; {new Date().getFullYear()} NZPOS. Built in New Zealand.
        </p>
      </footer>
    </main>
  )
}
