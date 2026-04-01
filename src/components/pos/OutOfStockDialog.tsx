'use client'

import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { verifyStaffPin } from '@/actions/auth/staffPin'
import type { Database } from '@/types/database'

type ProductRow = Database['public']['Tables']['products']['Row']
type StaffRow = { id: string; name: string; role: 'owner' | 'staff' }

type OutOfStockDialogProps = {
  product: ProductRow
  staffRole: 'owner' | 'staff'
  storeId: string
  staffList?: StaffRow[]
  onOverride: () => void
  onCancel: () => void
}

export function OutOfStockDialog({
  product,
  staffRole,
  storeId,
  staffList,
  onOverride,
  onCancel,
}: OutOfStockDialogProps) {
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState<string | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const [pinVerified, setPinVerified] = useState(false)

  // Find the owner staff record from the staff list
  const ownerStaff = staffList?.find((s) => s.role === 'owner')

  async function handlePinChange(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 4)
    setPin(digits)
    setPinError(null)

    if (digits.length === 4) {
      if (!ownerStaff) {
        setPinError('Owner account not found. Contact store owner.')
        return
      }
      setIsVerifying(true)
      const result = await verifyStaffPin({
        storeId,
        staffId: ownerStaff.id,
        pin: digits,
      })
      setIsVerifying(false)

      if ('error' in result) {
        setPinError(result.error ?? 'Verification failed')
        setPin('')
      } else {
        setPinVerified(true)
      }
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Dialog card */}
      <div className="relative bg-card rounded-xl shadow-lg p-6 w-80 max-w-[90vw]">
        {/* Warning icon */}
        <div className="flex justify-center mb-3">
          <div className="w-12 h-12 rounded-full bg-amber/10 flex items-center justify-center">
            <AlertTriangle size={24} className="text-amber" />
          </div>
        </div>

        {/* Heading */}
        <h2 className="text-xl font-bold text-text text-center mb-2">
          This product is out of stock
        </h2>

        {/* Sub-text */}
        <p className="text-sm text-text-muted text-center mb-5">
          {product.name} has 0 units available.
        </p>

        {/* Owner role: direct override button */}
        {staffRole === 'owner' ? (
          <button
            onClick={onOverride}
            className="w-full min-h-[44px] bg-amber text-white text-base font-bold rounded-lg mb-3 hover:opacity-90 transition-opacity"
          >
            Add anyway (override)
          </button>
        ) : (
          /* Staff role: PIN input required */
          <div className="mb-3">
            {!pinVerified ? (
              <>
                <label className="block text-sm text-text-muted mb-1 text-center">
                  Enter owner PIN to override
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => handlePinChange(e.target.value)}
                  placeholder="••••"
                  disabled={isVerifying}
                  className="w-full min-h-[44px] text-center text-xl font-bold border border-border rounded-lg px-3 bg-bg focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/20 disabled:opacity-50"
                />
                {isVerifying && (
                  <p className="text-sm text-text-muted text-center mt-2">Verifying…</p>
                )}
                {pinError && (
                  <p className="text-sm text-error text-center mt-2">{pinError}</p>
                )}
              </>
            ) : (
              <button
                onClick={onOverride}
                className="w-full min-h-[44px] bg-amber text-white text-base font-bold rounded-lg hover:opacity-90 transition-opacity"
              >
                Add anyway (override)
              </button>
            )}
          </div>
        )}

        {/* Cancel button */}
        <button
          onClick={onCancel}
          className="w-full min-h-[44px] border border-navy text-navy text-base font-bold rounded-lg hover:bg-surface transition-colors"
        >
          Keep out of stock
        </button>
      </div>
    </div>
  )
}
