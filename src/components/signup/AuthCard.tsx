import React from 'react'

interface AuthCardProps {
  children: React.ReactNode
}

/**
 * Reusable layout shell for auth pages (signup, verify-email).
 * Matches the login page card pattern: max-w-sm, white bg, border, shadow-md, p-8.
 * Per UI-SPEC: max-w-sm (384px), card padding 32px (p-8).
 */
export default function AuthCard({ children }: AuthCardProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--color-bg)]">
      <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow-md border border-[var(--color-border)]">
        {children}
      </div>
    </main>
  )
}
