'use client'

import React from 'react'

interface Props {
  children: React.ReactNode
  title: string
}

/**
 * WizardStepCard — card shell matching AuthCard pattern.
 * max-w-md, white, shadow-md, rounded-lg.
 */
export function WizardStepCard({ children, title }: Props) {
  return (
    <div className="max-w-md w-full mx-auto bg-white shadow-md rounded-lg p-[var(--space-xl)]">
      <h2 className="font-sans font-bold text-xl text-[var(--color-text)] mb-[var(--space-lg)]">
        {title}
      </h2>
      {children}
    </div>
  )
}
