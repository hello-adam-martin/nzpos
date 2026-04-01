'use client'

import { useState } from 'react'
import { formatNZD } from '@/lib/money'
import { CashUpModal } from './CashUpModal'

interface Session {
  id: string
  opened_at: string
  closed_at: string | null
  opening_float_cents: number
  closing_cash_cents: number | null
  expected_cash_cents: number | null
  variance_cents: number | null
  opened_by_name: string | null
  closed_by_name: string | null
}

interface CashUpAdminPageClientProps {
  sessions: Session[]
  currentSession: { id: string; opened_at: string; opening_float_cents: number } | null
}

function varianceColor(cents: number | null): string {
  if (cents === null) return 'text-[var(--color-text-muted)]'
  if (cents > 0) return 'text-[var(--color-success)]'
  if (cents === 0) return 'text-[var(--color-text-muted)]'
  if (cents >= -200) return 'text-[var(--color-text-muted)]'
  if (cents >= -500) return 'text-[var(--color-warning)]'
  return 'text-[var(--color-error)]'
}

function varianceLabel(cents: number | null): string {
  if (cents === null) return '—'
  if (cents > 0) return `Over ${formatNZD(cents)}`
  if (cents === 0) return 'Balanced'
  return `Short ${formatNZD(Math.abs(cents))}`
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-NZ', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

export function CashUpAdminPageClient({ sessions, currentSession }: CashUpAdminPageClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <div className="space-y-lg">
      {/* Action button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className={`text-sm font-bold px-md py-sm rounded-md cursor-pointer transition-colors ${
            currentSession
              ? 'bg-[var(--color-amber)] text-white hover:bg-[#D35400]'
              : 'bg-[var(--color-navy)] text-white hover:bg-[#334155]'
          }`}
        >
          {currentSession ? 'Close Session' : 'Open Session'}
        </button>
      </div>

      {/* Session history table */}
      <div className="bg-white border border-[var(--color-border)] rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[var(--color-navy)] text-white">
              <th className="text-left px-md py-sm font-bold">Open Time</th>
              <th className="text-left px-md py-sm font-bold">Close Time</th>
              <th className="text-right px-md py-sm font-bold">Opening Float</th>
              <th className="text-right px-md py-sm font-bold">Expected Cash</th>
              <th className="text-right px-md py-sm font-bold">Cash Counted</th>
              <th className="text-right px-md py-sm font-bold">Variance</th>
              <th className="text-left px-md py-sm font-bold">Opened By</th>
              <th className="text-left px-md py-sm font-bold">Closed By</th>
            </tr>
          </thead>
          <tbody>
            {sessions.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-md py-lg text-center text-[var(--color-text-muted)] font-normal"
                >
                  No cash sessions yet.
                </td>
              </tr>
            ) : (
              sessions.map((session) => (
                <tr
                  key={session.id}
                  className="border-t border-[var(--color-border)] hover:bg-[var(--color-surface)]"
                  style={{ minHeight: '48px' }}
                >
                  <td className="px-md py-sm font-normal text-[var(--color-text)]">
                    {formatDateTime(session.opened_at)}
                  </td>
                  <td className="px-md py-sm font-normal text-[var(--color-text)]">
                    {session.closed_at ? formatDateTime(session.closed_at) : (
                      <span className="text-[var(--color-success)] font-bold">Open</span>
                    )}
                  </td>
                  <td className="px-md py-sm font-mono font-normal text-right text-[var(--color-text)]">
                    {formatNZD(session.opening_float_cents)}
                  </td>
                  <td className="px-md py-sm font-mono font-normal text-right text-[var(--color-text)]">
                    {session.expected_cash_cents !== null ? formatNZD(session.expected_cash_cents) : '—'}
                  </td>
                  <td className="px-md py-sm font-mono font-normal text-right text-[var(--color-text)]">
                    {session.closing_cash_cents !== null ? formatNZD(session.closing_cash_cents) : '—'}
                  </td>
                  <td className={`px-md py-sm font-mono font-bold text-right ${varianceColor(session.variance_cents)}`}>
                    {varianceLabel(session.variance_cents)}
                  </td>
                  <td className="px-md py-sm font-normal text-[var(--color-text)]">
                    {session.opened_by_name ?? '—'}
                  </td>
                  <td className="px-md py-sm font-normal text-[var(--color-text)]">
                    {session.closed_by_name ?? '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <CashUpModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        currentSession={currentSession}
      />
    </div>
  )
}
