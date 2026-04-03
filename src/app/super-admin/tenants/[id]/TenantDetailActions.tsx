'use client'
import { useState } from 'react'
import { unsuspendTenant } from '@/actions/super-admin/unsuspendTenant'
import SuspendModal from '@/components/super-admin/SuspendModal'

interface TenantDetailActionsProps {
  storeId: string
  storeName: string
  isActive: boolean
}

export default function TenantDetailActions({ storeId, storeName, isActive }: TenantDetailActionsProps) {
  const [suspendOpen, setSuspendOpen] = useState(false)

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

      <SuspendModal
        storeId={storeId}
        storeName={storeName}
        isOpen={suspendOpen}
        onClose={() => setSuspendOpen(false)}
      />
    </>
  )
}
