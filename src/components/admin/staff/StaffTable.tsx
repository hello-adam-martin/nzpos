'use client'
import type { StaffMember } from '@/actions/staff/getStaffList'
import RoleBadge from './RoleBadge'
import StaffStatusBadge from './StaffStatusBadge'

interface StaffTableProps {
  staff: StaffMember[]
  onEdit: (member: StaffMember) => void
  onDeactivate: (member: StaffMember) => void
  onResetPin: (member: StaffMember) => void
  disabledRowId?: string
}

export default function StaffTable({
  staff,
  onEdit,
  onDeactivate,
  onResetPin,
  disabledRowId,
}: StaffTableProps) {
  return (
    <div className="rounded-[var(--radius-md)] border border-border overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-navy text-white text-xs font-semibold font-sans uppercase tracking-wide">
            <th className="text-left px-4 py-3 min-w-[180px]">Name</th>
            <th className="text-left px-4 py-3 w-[120px]">Role</th>
            <th className="text-left px-4 py-3 w-[100px]">Status</th>
            <th className="text-right px-4 py-3 w-[160px]">Actions</th>
          </tr>
        </thead>
        <tbody>
          {staff.map((member) => {
            const isDisabled = disabledRowId === member.id
            const nameClass = member.is_active ? 'text-text' : 'text-text-light'

            return (
              <tr
                key={member.id}
                className="border-t border-border min-h-[48px] hover:bg-surface transition-colors duration-100"
              >
                <td className={`px-4 py-3 text-sm font-sans ${nameClass}`}>
                  {member.name}
                </td>
                <td className="px-4 py-3">
                  <RoleBadge role={member.role} />
                </td>
                <td className="px-4 py-3">
                  <StaffStatusBadge isActive={member.is_active} />
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1 text-sm font-sans">
                    <button
                      type="button"
                      onClick={() => onEdit(member)}
                      disabled={isDisabled}
                      className="text-navy hover:text-navy/70 font-semibold transition-colors disabled:opacity-40"
                    >
                      Edit
                    </button>
                    <span className="text-text-muted px-1">|</span>
                    <button
                      type="button"
                      onClick={() => onResetPin(member)}
                      disabled={isDisabled}
                      className="text-navy hover:text-navy/70 font-semibold transition-colors disabled:opacity-40"
                    >
                      Reset PIN
                    </button>
                    <span className="text-text-muted px-1">|</span>
                    {member.is_active ? (
                      <button
                        type="button"
                        onClick={() => onDeactivate(member)}
                        disabled={isDisabled}
                        className="text-error hover:text-error/70 font-semibold transition-colors disabled:opacity-40"
                      >
                        Deactivate
                      </button>
                    ) : (
                      <span className="text-text-muted font-semibold">Inactive</span>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
