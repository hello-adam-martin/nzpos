'use client'

import { useEffect, useRef, useState } from 'react'
import { checkSlugAvailability } from '@/actions/auth/checkSlugAvailability'

type AvailabilityStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid'

interface SlugInputProps {
  value: string
  onChange: (slug: string) => void
  error?: string
}

/**
 * Slug input with debounced availability check (400ms).
 * Shows green checkmark (available), red X (taken/invalid), or spinner (checking).
 * Per UI-SPEC D-01, D-02.
 */
export default function SlugInput({ value, onChange, error }: SlugInputProps) {
  const [status, setStatus] = useState<AvailabilityStatus>('idle')
  const [reason, setReason] = useState<string>('')
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // Clear previous debounce timer
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    if (!value || value.length < 3) {
      setStatus('idle')
      setReason('')
      return
    }

    setStatus('checking')

    timeoutRef.current = setTimeout(async () => {
      try {
        const result = await checkSlugAvailability(value)
        if (result.available) {
          setStatus('available')
          setReason('')
        } else {
          // Determine if it's invalid format/reserved vs just taken
          if (result.reason) {
            setStatus('invalid')
            setReason(result.reason)
          } else {
            setStatus('taken')
            setReason('')
          }
        }
      } catch {
        setStatus('idle')
        setReason('')
      }
    }, 400)

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [value])

  const statusId = 'slug-status'
  const inputId = 'slug'

  return (
    <div>
      <label
        htmlFor={inputId}
        className="block font-sans text-sm font-semibold text-[var(--color-text)] mb-1"
      >
        Store address
      </label>
      <div className="relative">
        <input
          id={inputId}
          type="text"
          autoComplete="off"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-describedby={statusId}
          className="w-full rounded-md border border-[var(--color-border)] bg-white px-3 py-2 pr-10 font-sans text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-light)] focus:border-[var(--color-navy)] focus:outline-none focus:ring-1 focus:ring-[var(--color-navy)]"
          placeholder="my-store"
        />
        {/* Trailing icon */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          {status === 'checking' && (
            <svg
              className="animate-spin h-4 w-4 text-[var(--color-text-muted)]"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          )}
          {status === 'available' && (
            <svg
              className="h-4 w-4 text-[var(--color-success)]"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clipRule="evenodd"
              />
            </svg>
          )}
          {(status === 'taken' || status === 'invalid') && (
            <svg
              className="h-4 w-4 text-[var(--color-error)]"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </div>
      </div>

      {/* Hidden input for form submission */}
      <input type="hidden" name="slug" value={value} />

      {/* Status text with aria-live */}
      <div id={statusId} aria-live="polite" className="mt-1 min-h-[20px]">
        {status === 'idle' && value && value.length >= 3 && (
          <p className="font-sans text-sm text-[var(--color-text-muted)]">
            {value}.nzpos.co.nz
          </p>
        )}
        {status === 'idle' && (!value || value.length < 3) && (
          <p className="font-sans text-sm text-[var(--color-text-muted)]">
            {value ? `${value}.nzpos.co.nz` : 'Your store will be at your-store.nzpos.co.nz'}
          </p>
        )}
        {status === 'available' && (
          <p className="font-sans text-sm font-semibold text-[var(--color-success)]">
            {value} is available
          </p>
        )}
        {status === 'taken' && (
          <p className="font-sans text-sm font-semibold text-[var(--color-error)]">
            {value} is taken — try another
          </p>
        )}
        {status === 'invalid' && reason && (
          <p className="font-sans text-sm font-semibold text-[var(--color-error)]">
            {reason}
          </p>
        )}
        {error && (
          <p className="font-sans text-sm text-[var(--color-error)]">{error}</p>
        )}
      </div>
    </div>
  )
}
