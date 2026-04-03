'use client'

import { useState } from 'react'
import { LogoUploadZone } from '@/components/wizard/LogoUploadZone'
import { BrandColorPicker } from '@/components/wizard/BrandColorPicker'
import { updateBranding } from '@/actions/setup/updateBranding'

interface Props {
  storeName: string
  slug: string
  logoUrl: string | null
  primaryColor: string | null
}

/**
 * BrandingForm — client component for the admin settings page.
 * Allows editing store name, logo, and brand color post-wizard.
 */
export function BrandingForm({ storeName, slug, logoUrl, primaryColor }: Props) {
  const [name, setName] = useState(storeName)
  const [currentLogoUrl, setCurrentLogoUrl] = useState<string | null>(logoUrl)
  const [currentColor, setCurrentColor] = useState<string>(primaryColor ?? '#1E293B')
  const [isSaving, setIsSaving] = useState(false)
  const [savedMessage, setSavedMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const rootDomain =
    typeof window !== 'undefined'
      ? window.location.hostname.split('.').slice(-2).join('.')
      : 'yourdomain.com'

  const handleSave = async () => {
    setError(null)
    setSavedMessage(null)
    setIsSaving(true)

    const result = await updateBranding({
      storeName: name,
      logoUrl: currentLogoUrl,
      primaryColor: currentColor,
    })

    setIsSaving(false)

    if ('error' in result) {
      setError(result.error)
    } else {
      setSavedMessage('Settings saved.')
    }
  }

  return (
    <div className="max-w-md w-full bg-white shadow-md rounded-lg p-[var(--space-xl)]">
      <h2 className="font-sans font-bold text-xl text-[var(--color-text)] mb-[var(--space-lg)]">
        Store Settings
      </h2>

      {/* Store Name */}
      <div className="mb-[var(--space-md)]">
        <label
          htmlFor="settings-store-name"
          className="block font-sans text-sm font-normal text-[var(--color-text)] mb-[var(--space-xs)]"
        >
          Store Name
        </label>
        <input
          id="settings-store-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          className="w-full h-10 px-3 rounded-md border border-[var(--color-border)] bg-white text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-light)] focus:outline-none focus:ring-2 focus:ring-[var(--color-navy)]/20 focus:border-[var(--color-navy)]/40 transition-colors duration-150"
        />
      </div>

      {/* Slug — read-only */}
      <div className="mb-[var(--space-lg)]">
        <label className="block font-sans text-sm font-normal text-[var(--color-text-light)] mb-[var(--space-xs)]">
          Your store URL (set during signup, cannot be changed)
        </label>
        <p className="font-mono text-sm text-[var(--color-text-muted)] bg-[var(--color-surface)] rounded-md px-3 py-2 border border-[var(--color-border)]">
          {rootDomain}/{slug}
        </p>
      </div>

      {/* Logo upload */}
      <div className="mb-[var(--space-sm)]">
        <p className="font-sans text-sm font-normal text-[var(--color-text)] mb-[var(--space-xs)]">
          Logo
        </p>
        <LogoUploadZone logoUrl={currentLogoUrl} onChange={setCurrentLogoUrl} />
      </div>

      {/* Brand color picker */}
      <BrandColorPicker value={currentColor} onChange={setCurrentColor} />

      {/* Error message */}
      {error && (
        <p className="mb-[var(--space-sm)] font-sans text-sm text-[var(--color-error)]" role="alert">
          {error}
        </p>
      )}

      {/* Success message */}
      {savedMessage && (
        <p className="mb-[var(--space-sm)] font-sans text-sm text-[var(--color-success)]" role="status">
          {savedMessage}
        </p>
      )}

      {/* Save button */}
      <button
        type="button"
        onClick={handleSave}
        disabled={isSaving || !name.trim()}
        className="w-full min-h-[44px] rounded-md bg-[var(--color-amber)] text-white font-sans font-bold text-sm transition-colors duration-150 hover:bg-[var(--color-accent-hover)] disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isSaving ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  )
}
