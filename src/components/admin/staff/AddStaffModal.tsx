'use client'
import { useState, useTransition } from 'react'
import { createStaff } from '@/actions/staff/createStaff'

const PIN_BLACKLIST = [
  '0000', '1111', '2222', '3333', '4444', '5555',
  '6666', '7777', '8888', '9999', '1234', '4321',
]

function generateClientPin(): string {
  let pin: string
  do {
    pin = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
  } while (PIN_BLACKLIST.includes(pin))
  return pin
}

interface AddStaffModalProps {
  onClose: () => void
  onSuccess: (staffName: string, pin: string) => void
}

export default function AddStaffModal({ onClose, onSuccess }: AddStaffModalProps) {
  const [isPending, startTransition] = useTransition()
  const [name, setName] = useState('')
  const [role, setRole] = useState<'manager' | 'staff'>('staff')
  const [autoPin, setAutoPin] = useState(true)
  const [manualPin, setManualPin] = useState('')
  const [pinError, setPinError] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const [nameError, setNameError] = useState<string | null>(null)

  function validatePin(value: string): string | null {
    if (value.length === 0) return null
    if (!/^\d{4}$/.test(value)) return 'PIN must be exactly 4 digits.'
    if (PIN_BLACKLIST.includes(value)) return "That PIN isn't allowed. Enter a different 4-digit PIN."
    return null
  }

  function handlePinBlur() {
    if (!autoPin) {
      setPinError(validatePin(manualPin))
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setServerError(null)
    setNameError(null)

    const trimmedName = name.trim()
    if (!trimmedName) {
      setNameError('Name is required.')
      return
    }

    const pin = autoPin ? generateClientPin() : manualPin

    if (!autoPin) {
      const err = validatePin(pin)
      if (err) {
        setPinError(err)
        return
      }
    }

    startTransition(async () => {
      const result = await createStaff({ name: trimmedName, pin, role })
      if ('error' in result) {
        if (typeof result.error === 'object' && result.error !== null) {
          const fieldErrors = result.error as Record<string, string[]>
          if (fieldErrors.pin) setPinError(fieldErrors.pin[0])
          if (fieldErrors.name) setNameError(fieldErrors.name[0])
        } else {
          setServerError(result.error as string)
        }
        return
      }
      onSuccess(trimmedName, pin)
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div
        className="bg-card rounded-[var(--radius-lg)] shadow-lg w-full max-w-[480px] overflow-hidden"
        style={{ animation: 'modalOpen 250ms ease-out' }}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-0 flex items-center justify-between">
          <h2 className="text-xl font-semibold font-sans text-text">Add Staff Member</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-text-muted hover:text-text transition-colors p-1"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-6 flex flex-col gap-4">
            {/* Name input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold font-sans text-text" htmlFor="staff-name">
                Name
              </label>
              <input
                id="staff-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sarah Johnson"
                className="w-full border border-border rounded-[var(--radius-md)] px-4 py-2 text-sm font-sans text-text bg-bg placeholder:text-text-light focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy"
              />
              {nameError && (
                <p className="text-xs font-sans text-error">{nameError}</p>
              )}
            </div>

            {/* Role select */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold font-sans text-text" htmlFor="staff-role">
                Role
              </label>
              <select
                id="staff-role"
                value={role}
                onChange={(e) => setRole(e.target.value as 'manager' | 'staff')}
                className="w-full border border-border rounded-[var(--radius-md)] px-4 py-2 text-sm font-sans text-text bg-bg focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy"
              >
                <option value="staff">Staff</option>
                <option value="manager">Manager</option>
              </select>
            </div>

            {/* PIN section */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setAutoPin(true)}
                  className={[
                    'text-sm font-semibold font-sans px-3 py-1.5 rounded-[var(--radius-md)] border transition-colors',
                    autoPin
                      ? 'bg-navy text-white border-navy'
                      : 'bg-bg text-text-muted border-border hover:border-navy/50',
                  ].join(' ')}
                >
                  Auto-generate PIN
                </button>
                <button
                  type="button"
                  onClick={() => setAutoPin(false)}
                  className={[
                    'text-sm font-semibold font-sans px-3 py-1.5 rounded-[var(--radius-md)] border transition-colors',
                    !autoPin
                      ? 'bg-navy text-white border-navy'
                      : 'bg-bg text-text-muted border-border hover:border-navy/50',
                  ].join(' ')}
                >
                  Set a custom PIN
                </button>
              </div>

              {!autoPin && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold font-sans text-text" htmlFor="manual-pin">
                    4-digit PIN
                  </label>
                  <input
                    id="manual-pin"
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    value={manualPin}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 4)
                      setManualPin(val)
                      if (pinError) setPinError(null)
                    }}
                    onBlur={handlePinBlur}
                    placeholder="0000"
                    className="w-32 border border-border rounded-[var(--radius-md)] px-4 py-2 text-sm font-mono text-text bg-bg placeholder:text-text-light focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy text-center tracking-widest"
                  />
                  {pinError && (
                    <p className="text-xs font-sans text-error">{pinError}</p>
                  )}
                </div>
              )}
            </div>

            {serverError && (
              <p className="text-sm font-sans text-error">{serverError}</p>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 pb-6 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="flex-1 h-11 border border-navy text-navy text-sm font-semibold font-sans rounded-[var(--radius-md)] hover:bg-navy/5 transition-colors disabled:opacity-40"
            >
              Go Back
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 h-11 bg-amber text-white text-sm font-semibold font-sans rounded-[var(--radius-md)] hover:bg-amber-hover transition-colors disabled:opacity-40"
            >
              {isPending ? 'Adding…' : 'Add Staff Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
