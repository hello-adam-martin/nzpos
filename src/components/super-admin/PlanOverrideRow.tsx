'use client'
import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import { activateAddon } from '@/actions/super-admin/activateAddon'
import { deactivateAddon } from '@/actions/super-admin/deactivateAddon'
import AddonStatusBadge from './AddonStatusBadge'

interface PlanOverrideRowProps {
  storeId: string
  feature: string
  name: string
  isActive: boolean
  isManualOverride: boolean
}

function ActivateButton({ name }: { name: string }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      aria-label={`Activate ${name}`}
      className="bg-[var(--color-amber)] text-white text-sm font-semibold px-3 py-1.5 rounded-[var(--radius-md)] hover:bg-[var(--color-amber)]/90 disabled:opacity-60 transition-colors duration-150"
    >
      {pending ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Activating...
        </span>
      ) : (
        'Activate Add-on'
      )}
    </button>
  )
}

function DeactivateConfirmButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-[var(--color-error)] text-white text-sm font-semibold px-3 py-1.5 rounded-[var(--radius-md)] hover:bg-[var(--color-error)]/90 disabled:opacity-60 transition-colors duration-150"
    >
      {pending ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Deactivating...
        </span>
      ) : (
        'Confirm Deactivate'
      )}
    </button>
  )
}

export default function PlanOverrideRow({
  storeId,
  feature,
  name,
  isActive,
  isManualOverride,
}: PlanOverrideRowProps) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [activateError, setActivateError] = useState<string | null>(null)
  const [deactivateError, setDeactivateError] = useState<string | null>(null)

  async function handleActivate(formData: FormData) {
    setActivateError(null)
    const result = await activateAddon(formData)
    if ('error' in result) {
      setActivateError('Failed to activate add-on. Please try again.')
    }
  }

  async function handleDeactivate(formData: FormData) {
    setDeactivateError(null)
    const result = await deactivateAddon(formData)
    if ('error' in result) {
      setDeactivateError('Failed to deactivate add-on. Please try again.')
    } else {
      setConfirmOpen(false)
    }
  }

  return (
    <div className="border-b border-[var(--color-border-light)] last:border-0">
      <div className="flex items-center justify-between py-3">
        {/* Left: name + badge */}
        <div className="flex items-center gap-3">
          <span className="text-base font-sans text-[var(--color-text)]">{name}</span>
          <AddonStatusBadge isActive={isActive} isManualOverride={isManualOverride} />
        </div>

        {/* Right: action button */}
        <div>
          {!isActive && (
            <form action={handleActivate}>
              <input type="hidden" name="storeId" value={storeId} />
              <input type="hidden" name="feature" value={feature} />
              <ActivateButton name={name} />
            </form>
          )}
          {isActive && isManualOverride && !confirmOpen && (
            <button
              type="button"
              onClick={() => setConfirmOpen(true)}
              className="text-[var(--color-error)] text-sm font-semibold hover:underline transition-colors duration-150"
            >
              Deactivate
            </button>
          )}
          {isActive && !isManualOverride && null /* Active via Stripe — read-only */}
        </div>
      </div>

      {/* Inline confirm for deactivate */}
      {confirmOpen && (
        <div className="pb-3 transition-all duration-150 ease-out">
          <p className="text-sm font-sans text-[var(--color-text-muted)] mb-3">
            Deactivate {name}? This will remove the store&apos;s access immediately.
          </p>
          <div className="flex items-center gap-3">
            <form action={handleDeactivate}>
              <input type="hidden" name="storeId" value={storeId} />
              <input type="hidden" name="feature" value={feature} />
              <DeactivateConfirmButton />
            </form>
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              className="text-sm font-sans text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors duration-150"
            >
              Cancel
            </button>
          </div>
          {deactivateError && (
            <p className="mt-2 text-sm font-sans text-[var(--color-error)]">{deactivateError}</p>
          )}
        </div>
      )}

      {activateError && (
        <p className="pb-3 text-sm font-sans text-[var(--color-error)]">{activateError}</p>
      )}
    </div>
  )
}
