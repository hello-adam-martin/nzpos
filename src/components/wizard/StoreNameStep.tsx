'use client'

import { useState } from 'react'
import { WizardStepCard } from './WizardStepCard'
import { saveStoreNameStep } from '@/actions/setup/saveStoreNameStep'

interface Props {
  storeName: string
  slug: string
  onSave: () => void
  onSkip: () => void
}

/**
 * StoreNameStep — wizard step 1.
 * Pre-fills store name, shows read-only slug, Save & Continue or Skip.
 */
export function StoreNameStep({ storeName, slug, onSave, onSkip }: Props) {
  const [name, setName] = useState(storeName)
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Infer the root domain for slug display
  const rootDomain =
    typeof window !== 'undefined'
      ? window.location.hostname.split('.').slice(-2).join('.')
      : 'yourdomain.com'

  const handleSave = async () => {
    setError(null)
    setIsSaving(true)
    const result = await saveStoreNameStep({ storeName: name })
    setIsSaving(false)

    if ('error' in result) {
      setError(result.error)
    } else {
      onSave()
    }
  }

  return (
    <WizardStepCard title="Name your store">
      {/* Store Name field */}
      <div className="mb-[var(--space-md)]">
        <label
          htmlFor="store-name"
          className="block font-sans text-sm font-normal text-[var(--color-text)] mb-[var(--space-xs)]"
        >
          Store Name
        </label>
        <input
          id="store-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          className="w-full h-10 px-3 rounded-md border border-[var(--color-border)] bg-white text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-light)] focus:outline-none focus:ring-2 focus:ring-[var(--color-navy)]/20 focus:border-[var(--color-navy)]/40 transition-colors duration-150"
          aria-describedby="store-name-help"
          autoFocus
        />
        <p id="store-name-help" className="mt-1 font-sans text-sm text-[var(--color-text-muted)]">
          This appears on your storefront and receipts.
        </p>
      </div>

      {/* Slug display */}
      <div className="mb-[var(--space-lg)]">
        <label
          className="block font-sans text-sm font-normal text-[var(--color-text-light)] mb-[var(--space-xs)]"
        >
          Your store URL (set during signup, cannot be changed)
        </label>
        <p className="font-mono text-sm text-[var(--color-text-muted)] bg-[var(--color-surface)] rounded-md px-3 py-2 border border-[var(--color-border)]">
          {rootDomain}/{slug}
        </p>
      </div>

      {/* Error message */}
      {error && (
        <p className="mb-[var(--space-sm)] font-sans text-sm text-[var(--color-error)]" role="alert">
          {error}
        </p>
      )}

      {/* Primary CTA */}
      <button
        type="button"
        onClick={handleSave}
        disabled={isSaving || !name.trim()}
        className="w-full min-h-[44px] rounded-md bg-[var(--color-amber)] text-white font-sans font-bold text-sm transition-colors duration-150 hover:bg-[var(--color-accent-hover)] disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isSaving ? 'Saving...' : 'Save & Continue'}
      </button>

      {/* Skip CTA */}
      <div className="mt-[var(--space-sm)] text-center">
        <button
          type="button"
          onClick={onSkip}
          className="font-sans text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors duration-150"
        >
          Skip for now
        </button>
      </div>
    </WizardStepCard>
  )
}
