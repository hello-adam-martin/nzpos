'use client'

import { useState } from 'react'
import { WizardStepCard } from './WizardStepCard'
import { LogoUploadZone } from './LogoUploadZone'
import { BrandColorPicker } from './BrandColorPicker'
import { saveLogoStep } from '@/actions/setup/saveLogoStep'

interface Props {
  logoUrl: string | null
  primaryColor: string | null
  onSave: () => void
  onSkip: () => void
}

/**
 * LogoBrandStep — wizard step 2.
 * Logo upload + brand colour picker. Save & Continue or Skip.
 */
export function LogoBrandStep({ logoUrl, primaryColor, onSave, onSkip }: Props) {
  const [currentLogoUrl, setCurrentLogoUrl] = useState<string | null>(logoUrl)
  const [currentColor, setCurrentColor] = useState<string>(primaryColor ?? '#1E293B')
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = async () => {
    setError(null)
    setIsSaving(true)
    const result = await saveLogoStep({
      logoUrl: currentLogoUrl,
      primaryColor: currentColor,
    })
    setIsSaving(false)

    if ('error' in result) {
      setError(result.error)
    } else {
      onSave()
    }
  }

  return (
    <WizardStepCard title="Add your logo and brand colour">
      <LogoUploadZone logoUrl={currentLogoUrl} onChange={setCurrentLogoUrl} />

      <BrandColorPicker value={currentColor} onChange={setCurrentColor} />

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
        disabled={isSaving}
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
