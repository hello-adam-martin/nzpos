'use client'
import { useState } from 'react'
import type { XeroConnection } from '@/lib/xero/types'
import { saveXeroSettings } from '@/actions/xero/saveXeroSettings'

interface XeroAccountCodeFormProps {
  connection: XeroConnection
}

export default function XeroAccountCodeForm({ connection }: XeroAccountCodeFormProps) {
  const [cashAccountCode, setCashAccountCode] = useState(connection.account_code_cash ?? '')
  const [eftposAccountCode, setEftposAccountCode] = useState(connection.account_code_eftpos ?? '')
  const [onlineAccountCode, setOnlineAccountCode] = useState(connection.account_code_online ?? '')
  const [isSaving, setIsSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setSuccess(false)
    setError(null)

    try {
      const result = await saveXeroSettings({
        cashAccountCode,
        eftposAccountCode,
        onlineAccountCode,
      })

      if (result.success) {
        setSuccess(true)
        setTimeout(() => setSuccess(false), 5000)
      } else {
        setError(result.error ?? 'Failed to save account codes')
      }
    } catch {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const inputClass =
    'w-full h-[48px] border border-[var(--color-border)] rounded-[var(--radius-md)] px-3 text-base font-sans text-[var(--color-text)] bg-[var(--color-card)] focus:outline-none focus:ring-2 focus:ring-amber focus:border-transparent'

  return (
    <form onSubmit={handleSubmit} className="space-y-[var(--space-md)]">
      <p className="text-sm font-sans text-[var(--color-text-muted)]">
        Map your Xero chart of accounts. Each payment method posts to a separate account.
      </p>

      {/* Cash Sales Account Code */}
      <div className="space-y-[var(--space-xs)]">
        <label
          htmlFor="cashAccountCode"
          className="block text-sm font-semibold font-sans text-[var(--color-text)]"
        >
          Cash Sales Account Code
        </label>
        <input
          id="cashAccountCode"
          type="text"
          value={cashAccountCode}
          onChange={e => setCashAccountCode(e.target.value)}
          placeholder="e.g. 200"
          className={inputClass}
          maxLength={20}
        />
        <p className="text-xs font-sans text-[var(--color-text-muted)]">
          The Xero account code for cash sales revenue.
        </p>
      </div>

      {/* EFTPOS Sales Account Code */}
      <div className="space-y-[var(--space-xs)]">
        <label
          htmlFor="eftposAccountCode"
          className="block text-sm font-semibold font-sans text-[var(--color-text)]"
        >
          EFTPOS Sales Account Code
        </label>
        <input
          id="eftposAccountCode"
          type="text"
          value={eftposAccountCode}
          onChange={e => setEftposAccountCode(e.target.value)}
          placeholder="e.g. 201"
          className={inputClass}
          maxLength={20}
        />
        <p className="text-xs font-sans text-[var(--color-text-muted)]">
          The Xero account code for EFTPOS sales revenue.
        </p>
      </div>

      {/* Online Sales Account Code */}
      <div className="space-y-[var(--space-xs)]">
        <label
          htmlFor="onlineAccountCode"
          className="block text-sm font-semibold font-sans text-[var(--color-text)]"
        >
          Online Sales Account Code (Stripe)
        </label>
        <input
          id="onlineAccountCode"
          type="text"
          value={onlineAccountCode}
          onChange={e => setOnlineAccountCode(e.target.value)}
          placeholder="e.g. 202"
          className={inputClass}
          maxLength={20}
        />
        <p className="text-xs font-sans text-[var(--color-text-muted)]">
          The Xero account code for online (Stripe) sales revenue.
        </p>
      </div>

      {/* Feedback */}
      {success && (
        <p className="text-sm font-sans font-semibold" style={{ color: '#059669' }}>
          Account codes saved
        </p>
      )}
      {error && (
        <p className="text-sm font-sans" style={{ color: '#DC2626' }}>
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isSaving}
        className="inline-flex items-center bg-[var(--color-navy)] text-white font-semibold font-sans px-4 py-2 rounded-[var(--radius-md)] hover:bg-navy-light transition-colors duration-150 text-sm disabled:opacity-50"
      >
        {isSaving ? 'Saving...' : 'Save Account Codes'}
      </button>
    </form>
  )
}
