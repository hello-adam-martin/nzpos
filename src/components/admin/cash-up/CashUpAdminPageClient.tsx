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
    <div className="space-y-6">
      {/* Action button */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className={`text-sm font-bold px-4 py-2 rounded-md cursor-pointer transition-colors ${
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
              <th className="text-left px-4 py-2 font-bold">Open Time</th>
              <th className="text-left px-4 py-2 font-bold">Close Time</th>
              <th className="text-right px-4 py-2 font-bold">Opening Float</th>
              <th className="text-right px-4 py-2 font-bold">Expected Cash</th>
              <th className="text-right px-4 py-2 font-bold">Cash Counted</th>
              <th className="text-right px-4 py-2 font-bold">Variance</th>
              <th className="text-left px-4 py-2 font-bold">Opened By</th>
              <th className="text-left px-4 py-2 font-bold">Closed By</th>
            </tr>
          </thead>
          <tbody>
            {sessions.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[var(--color-surface)] mb-3">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--color-text-muted)]">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-[var(--color-text)] mb-1">No cash sessions yet</p>
                  <p className="text-sm text-[var(--color-text-muted)]">Open a session to start tracking your cash drawer.</p>
                </td>
              </tr>
            ) : (
              sessions.map((session) => (
                <tr
                  key={session.id}
                  className="border-t border-[var(--color-border)] hover:bg-[var(--color-surface)]"
                  style={{ minHeight: '48px' }}
                >
                  <td className="px-4 py-2 font-normal text-[var(--color-text)]">
                    {formatDateTime(session.opened_at)}
                  </td>
                  <td className="px-4 py-2 font-normal text-[var(--color-text)]">
                    {session.closed_at ? formatDateTime(session.closed_at) : (
                      <span className="text-[var(--color-success)] font-bold">Open</span>
                    )}
                  </td>
                  <td className="px-4 py-2 font-mono font-normal text-right text-[var(--color-text)]">
                    {formatNZD(session.opening_float_cents)}
                  </td>
                  <td className="px-4 py-2 font-mono font-normal text-right text-[var(--color-text)]">
                    {session.expected_cash_cents !== null ? formatNZD(session.expected_cash_cents) : '—'}
                  </td>
                  <td className="px-4 py-2 font-mono font-normal text-right text-[var(--color-text)]">
                    {session.closing_cash_cents !== null ? formatNZD(session.closing_cash_cents) : '—'}
                  </td>
                  <td className={`px-4 py-2 font-mono font-bold text-right ${varianceColor(session.variance_cents)}`}>
                    {varianceLabel(session.variance_cents)}
                  </td>
                  <td className="px-4 py-2 font-normal text-[var(--color-text)]">
                    {session.opened_by_name ?? '—'}
                  </td>
                  <td className="px-4 py-2 font-normal text-[var(--color-text)]">
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
