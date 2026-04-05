'use client'

import { useState, useTransition } from 'react'
import { updateBusinessDetails } from '@/actions/settings/updateBusinessDetails'

interface Props {
  businessAddress: string
  phone: string
  irdGstNumber: string
}

/**
 * BusinessDetailsForm — settings section for business address, phone, and IRD/GST number.
 */
export function BusinessDetailsForm({ businessAddress, phone, irdGstNumber }: Props) {
  const [address, setAddress] = useState(businessAddress)
  const [phoneValue, setPhone] = useState(phone)
  const [irdValue, setIrd] = useState(irdGstNumber)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSave = () => {
    setSuccess(false)
    setError(null)
    startTransition(async () => {
      const result = await updateBusinessDetails({
        business_address: address,
        phone: phoneValue,
        ird_gst_number: irdValue,
      })
      if ('error' in result) {
        setError(result.error)
      } else {
        setSuccess(true)
      }
    })
  }

  return (
    <div className="max-w-md w-full bg-card border border-[var(--color-border)] shadow-sm rounded-[var(--radius-lg)] p-[var(--space-xl)]">
      <h2 className="text-base font-bold font-sans text-[var(--color-text)] mb-[var(--space-lg)]">
        Business Details
      </h2>

      {/* Business Address */}
      <div className="mb-[var(--space-md)]">
        <label
          htmlFor="business-address"
          className="block font-sans text-sm font-normal text-[var(--color-text)] mb-[var(--space-xs)]"
        >
          Business Address
        </label>
        <input
          id="business-address"
          type="text"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          maxLength={500}
          placeholder="e.g. 12 Example St, Auckland 1010"
          className="w-full h-10 px-3 rounded-md border border-[var(--color-border)] bg-white text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-light)] focus:outline-none focus:ring-2 focus:ring-[var(--color-navy)]/20 focus:border-[var(--color-navy)]/40 transition-colors duration-150"
        />
      </div>

      {/* Phone Number */}
      <div className="mb-[var(--space-md)]">
        <label
          htmlFor="business-phone"
          className="block font-sans text-sm font-normal text-[var(--color-text)] mb-[var(--space-xs)]"
        >
          Phone Number
        </label>
        <input
          id="business-phone"
          type="text"
          value={phoneValue}
          onChange={(e) => setPhone(e.target.value)}
          maxLength={50}
          placeholder="e.g. 09 123 4567"
          className="w-full h-10 px-3 rounded-md border border-[var(--color-border)] bg-white text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-light)] focus:outline-none focus:ring-2 focus:ring-[var(--color-navy)]/20 focus:border-[var(--color-navy)]/40 transition-colors duration-150"
        />
      </div>

      {/* IRD / GST Number */}
      <div className="mb-[var(--space-md)]">
        <label
          htmlFor="ird-gst-number"
          className="block font-sans text-sm font-normal text-[var(--color-text)] mb-[var(--space-xs)]"
        >
          IRD / GST Number
        </label>
        <input
          id="ird-gst-number"
          type="text"
          value={irdValue}
          onChange={(e) => setIrd(e.target.value)}
          maxLength={50}
          placeholder="e.g. 123-456-789"
          className="w-full h-10 px-3 rounded-md border border-[var(--color-border)] bg-white font-mono text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-light)] focus:outline-none focus:ring-2 focus:ring-[var(--color-navy)]/20 focus:border-[var(--color-navy)]/40 transition-colors duration-150"
        />
      </div>

      {/* Error message */}
      {error && (
        <p className="mb-[var(--space-sm)] font-sans text-sm text-[var(--color-error)]" role="alert">
          {error}
        </p>
      )}

      {/* Success message */}
      {success && (
        <p className="mb-[var(--space-sm)] font-sans text-sm text-[var(--color-success)]" role="status">
          Settings saved.
        </p>
      )}

      {/* Save button */}
      <button
        type="button"
        onClick={handleSave}
        disabled={isPending}
        className="w-full min-h-[44px] rounded-md bg-[var(--color-amber)] text-white font-sans font-bold text-sm transition-colors duration-150 hover:bg-[var(--color-accent-hover)] disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isPending ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  )
}
