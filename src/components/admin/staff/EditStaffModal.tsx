'use client'
import { useState, useTransition } from 'react'
import type { StaffMember } from '@/actions/staff/getStaffList'

interface EditStaffModalProps {
  member: StaffMember
  onClose: () => void
  onSave: (staffId: string, name: string, newRole: string, roleChanged: boolean) => void
}

export default function EditStaffModal({ member, onClose, onSave }: EditStaffModalProps) {
  const [isPending] = useTransition()
  const [name, setName] = useState(member.name)
  const [role, setRole] = useState(member.role)
  const [nameError, setNameError] = useState<string | null>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setNameError(null)

    const trimmedName = name.trim()
    if (!trimmedName) {
      setNameError('Name is required.')
      return
    }

    const roleChanged = role !== member.role
    onSave(member.id, trimmedName, role, roleChanged)
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/50">
      <div
        className="bg-card rounded-[var(--radius-lg)] shadow-lg w-full max-w-[480px] overflow-hidden"
        style={{ animation: 'modalOpen 250ms ease-out' }}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-0 flex items-center justify-between">
          <h2 className="text-xl font-semibold font-sans text-text">Edit Staff Member</h2>
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
              <label className="text-sm font-semibold font-sans text-text" htmlFor="edit-staff-name">
                Name
              </label>
              <input
                id="edit-staff-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-border rounded-[var(--radius-md)] px-4 py-2 text-sm font-sans text-text bg-bg placeholder:text-text-light focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy"
              />
              {nameError && (
                <p className="text-xs font-sans text-error">{nameError}</p>
              )}
            </div>

            {/* Role select */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold font-sans text-text" htmlFor="edit-staff-role">
                Role
              </label>
              <select
                id="edit-staff-role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full border border-border rounded-[var(--radius-md)] px-4 py-2 text-sm font-sans text-text bg-bg focus:outline-none focus:ring-2 focus:ring-navy/30 focus:border-navy"
              >
                <option value="staff">Staff</option>
                <option value="manager">Manager</option>
                <option value="owner">Owner</option>
              </select>
            </div>
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
              className="flex-1 h-11 bg-navy text-white text-sm font-semibold font-sans rounded-[var(--radius-md)] hover:bg-navy/90 transition-colors disabled:opacity-40"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
