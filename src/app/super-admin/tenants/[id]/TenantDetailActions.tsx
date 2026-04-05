'use client'
import { useState } from 'react'
import { unsuspendTenant } from '@/actions/super-admin/unsuspendTenant'
import SuspendModal from '@/components/super-admin/SuspendModal'
import PasswordResetModal from '@/components/super-admin/PasswordResetModal'
import DisableAccountModal from '@/components/super-admin/DisableAccountModal'

interface TenantDetailActionsProps {
  storeId: string
  storeName: string
  isActive: boolean
  ownerEmail: string | null
  ownerAuthId: string | null
}

export default function TenantDetailActions({
  storeId,
  storeName,
  isActive,
  ownerEmail,
  ownerAuthId,
}: TenantDetailActionsProps) {
  const [suspendOpen, setSuspendOpen] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)
  const [disableOpen, setDisableOpen] = useState(false)

  return (
    <>
      {isActive ? (
        <button
          type="button"
          onClick={() => setSuspendOpen(true)}
          className="w-full bg-[var(--color-error)] text-white font-semibold font-sans py-2 rounded-[var(--radius-md)] hover:bg-[var(--color-error)]/90 transition-colors duration-150"
        >
          Suspend Store
        </button>
      ) : (
        <form action={async (fd) => { await unsuspendTenant(fd) }}>
          <input type="hidden" name="storeId" value={storeId} />
          <button
            type="submit"
            className="w-full bg-[var(--color-navy)] text-white font-semibold font-sans py-2 rounded-[var(--radius-md)] hover:bg-[var(--color-navy)]/90 transition-colors duration-150"
          >
            Unsuspend Store
          </button>
        </form>
      )}

      <div className="border-t border-[var(--color-border)] my-4"></div>

      <h3 className="font-sans text-sm font-semibold text-[var(--color-text-muted)] mb-3">Account</h3>

      {ownerEmail && (
        <button
          type="button"
          onClick={() => setResetOpen(true)}
          className="w-full bg-[var(--color-navy)] text-white font-semibold font-sans py-2 rounded-[var(--radius-md)] hover:bg-[var(--color-navy)]/90 transition-colors duration-150 mb-2"
        >
          Send Password Reset
        </button>
      )}

      {ownerAuthId && (
        <button
          type="button"
          onClick={() => setDisableOpen(true)}
          className="w-full border border-[var(--color-navy)] text-[var(--color-navy)] bg-transparent font-semibold font-sans py-2 rounded-[var(--radius-md)] hover:bg-[var(--color-navy)]/5 transition-colors duration-150"
        >
          {isActive ? 'Disable Account' : 'Re-enable Account'}
        </button>
      )}

      <SuspendModal
        storeId={storeId}
        storeName={storeName}
        isOpen={suspendOpen}
        onClose={() => setSuspendOpen(false)}
      />

      {ownerEmail && (
        <PasswordResetModal
          storeId={storeId}
          storeName={storeName}
          ownerEmail={ownerEmail}
          isOpen={resetOpen}
          onClose={() => setResetOpen(false)}
        />
      )}

      {ownerAuthId && (
        <DisableAccountModal
          storeId={storeId}
          storeName={storeName}
          ownerAuthId={ownerAuthId}
          isOpen={disableOpen}
          onClose={() => setDisableOpen(false)}
          mode={isActive ? 'disable' : 'enable'}
        />
      )}
    </>
  )
}
