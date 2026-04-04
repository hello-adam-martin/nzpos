'use client'
import { useState, useTransition } from 'react'
import type { StaffMember } from '@/actions/staff/getStaffList'
import { updateStaff } from '@/actions/staff/updateStaff'
import { deactivateStaff } from '@/actions/staff/deactivateStaff'
import { resetStaffPin } from '@/actions/staff/resetStaffPin'
import { createStaff } from '@/actions/staff/createStaff'
import StaffTable from './StaffTable'
import AddStaffModal from './AddStaffModal'
import EditStaffModal from './EditStaffModal'
import PinDisplayModal from './PinDisplayModal'
import ConfirmDeactivateModal from './ConfirmDeactivateModal'
import ConfirmRoleChangeModal from './ConfirmRoleChangeModal'

type ActiveModal = 'add' | 'edit' | 'deactivate' | 'roleChange' | 'pinDisplay' | null

interface StaffPageClientProps {
  staff: StaffMember[]
}

interface Toast {
  id: number
  message: string
  type: 'success' | 'error'
}

let toastIdCounter = 0

export default function StaffPageClient({ staff }: StaffPageClientProps) {
  const [activeModal, setActiveModal] = useState<ActiveModal>(null)
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null)
  const [pendingPin, setPendingPin] = useState<string | null>(null)
  const [pendingRole, setPendingRole] = useState<string | null>(null)
  const [pendingName, setPendingName] = useState<string | null>(null)
  const [disabledRowId, setDisabledRowId] = useState<string | undefined>(undefined)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [isPending, startTransition] = useTransition()

  function addToast(message: string, type: 'success' | 'error' = 'success') {
    const id = ++toastIdCounter
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3000)
  }

  function handleAddSuccess(staffName: string, pin: string) {
    setActiveModal(null)
    setPendingPin(pin)
    setPendingName(staffName)
    setActiveModal('pinDisplay')
    addToast(`${staffName} added.`)
  }

  function handleEdit(member: StaffMember) {
    setSelectedStaff(member)
    setActiveModal('edit')
  }

  function handleDeactivate(member: StaffMember) {
    setSelectedStaff(member)
    setActiveModal('deactivate')
  }

  function handleResetPin(member: StaffMember) {
    setDisabledRowId(member.id)
    startTransition(async () => {
      const result = await resetStaffPin({ staffId: member.id })
      setDisabledRowId(undefined)
      if ('error' in result) {
        addToast('Something went wrong. Check your connection and try again.', 'error')
        return
      }
      setSelectedStaff(member)
      setPendingPin(result.pin)
      setActiveModal('pinDisplay')
      addToast(`PIN reset for ${member.name}.`)
    })
  }

  function handleEditSave(staffId: string, name: string, newRole: string, roleChanged: boolean) {
    if (roleChanged) {
      setPendingRole(newRole)
      setPendingName(name)
      setActiveModal('roleChange')
      // selectedStaff and EditStaffModal stays mounted behind overlay
    } else {
      // Name-only change: call updateStaff directly
      startTransition(async () => {
        const member = selectedStaff!
        const result = await updateStaff({ staffId, name })
        if ('error' in result) {
          addToast('Something went wrong. Check your connection and try again.', 'error')
          return
        }
        setActiveModal(null)
        setSelectedStaff(null)
        addToast(`${member.name} updated.`)
      })
    }
  }

  function handleConfirmRoleChange() {
    if (!selectedStaff || !pendingRole) return
    const staffId = selectedStaff.id
    const name = pendingName ?? selectedStaff.name
    const newRole = pendingRole
    const memberName = selectedStaff.name

    startTransition(async () => {
      const result = await updateStaff({ staffId, name, role: newRole })
      if ('error' in result) {
        addToast('Something went wrong. Check your connection and try again.', 'error')
        return
      }
      setActiveModal(null)
      setSelectedStaff(null)
      setPendingRole(null)
      setPendingName(null)
      addToast(`${memberName}'s role changed to ${newRole.charAt(0).toUpperCase() + newRole.slice(1)}.`)
    })
  }

  function handleCancelRoleChange() {
    // Close role change modal, EditStaffModal stays open (re-show it)
    setActiveModal('edit')
  }

  function handleConfirmDeactivate() {
    if (!selectedStaff) return
    const member = selectedStaff

    startTransition(async () => {
      const result = await deactivateStaff({ staffId: member.id })
      if ('error' in result) {
        addToast('Something went wrong. Check your connection and try again.', 'error')
        return
      }
      setActiveModal(null)
      setSelectedStaff(null)
      addToast(`${member.name} deactivated.`)
    })
  }

  function handleCloseModal() {
    setActiveModal(null)
    setSelectedStaff(null)
    setPendingPin(null)
    setPendingRole(null)
    setPendingName(null)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold font-sans text-text">Staff</h1>
          <p className="text-sm font-sans text-text-muted mt-1">
            Manage your team&apos;s access and PINs.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setActiveModal('add')}
          className="px-4 py-2 text-sm font-semibold font-sans bg-amber text-white rounded-[var(--radius-md)] hover:bg-amber-hover transition-colors"
        >
          Add Staff Member
        </button>
      </div>

      {/* Staff table or empty state */}
      {staff.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-card rounded-[var(--radius-md)] border border-border gap-4">
          <h2 className="text-lg font-semibold font-sans text-text">No staff yet</h2>
          <p className="text-sm font-sans text-text-muted text-center max-w-xs">
            Add your first staff member to give them POS access.
          </p>
          <button
            type="button"
            onClick={() => setActiveModal('add')}
            className="px-4 py-2 text-sm font-semibold font-sans bg-amber text-white rounded-[var(--radius-md)] hover:bg-amber-hover transition-colors"
          >
            Add Staff Member
          </button>
        </div>
      ) : (
        <StaffTable
          staff={staff}
          onEdit={handleEdit}
          onDeactivate={handleDeactivate}
          onResetPin={handleResetPin}
          disabledRowId={disabledRowId}
        />
      )}

      {/* Modals */}
      {activeModal === 'add' && (
        <AddStaffModal
          onClose={handleCloseModal}
          onSuccess={handleAddSuccess}
        />
      )}

      {activeModal === 'edit' && selectedStaff && (
        <EditStaffModal
          member={selectedStaff}
          onClose={handleCloseModal}
          onSave={handleEditSave}
        />
      )}

      {activeModal === 'roleChange' && selectedStaff && pendingRole && (
        <>
          {/* EditStaffModal stays mounted behind at z-40 */}
          <EditStaffModal
            member={selectedStaff}
            onClose={handleCloseModal}
            onSave={handleEditSave}
          />
          <ConfirmRoleChangeModal
            staffName={selectedStaff.name}
            currentRole={selectedStaff.role}
            newRole={pendingRole}
            isPending={isPending}
            onConfirm={handleConfirmRoleChange}
            onCancel={handleCancelRoleChange}
          />
        </>
      )}

      {activeModal === 'deactivate' && selectedStaff && (
        <ConfirmDeactivateModal
          staffName={selectedStaff.name}
          isPending={isPending}
          onConfirm={handleConfirmDeactivate}
          onCancel={handleCloseModal}
        />
      )}

      {activeModal === 'pinDisplay' && pendingPin && (
        <PinDisplayModal
          pin={pendingPin}
          onDone={handleCloseModal}
        />
      )}

      {/* Toast notifications */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={[
              'px-4 py-3 rounded-[var(--radius-md)] text-sm font-semibold font-sans text-white shadow-lg',
              toast.type === 'error' ? 'bg-error' : 'bg-navy',
            ].join(' ')}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  )
}
