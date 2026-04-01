'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { verifyStaffPin } from '@/actions/auth/staffPin'

interface StaffMember {
  id: string
  name: string
  role: string
}

interface PinLoginFormProps {
  storeId: string
  storeName: string
  staffList: StaffMember[]
}

export function PinLoginForm({ storeId, storeName, staffList }: PinLoginFormProps) {
  const router = useRouter()
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null)
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(currentPin: string) {
    if (!selectedStaffId || currentPin.length !== 4) return
    setIsSubmitting(true)
    setError(null)
    const result = await verifyStaffPin({
      storeId,
      staffId: selectedStaffId,
      pin: currentPin,
    })
    if ('error' in result) {
      setError(result.error ?? 'An error occurred')
      setPin('') // Clear PIN on error so staff can retry
      setIsSubmitting(false)
      return
    }
    // Success — redirect to POS
    router.push('/pos')
  }

  function handleDigit(digit: string) {
    if (isSubmitting) return
    const newPin = pin.length < 4 ? pin + digit : pin
    setPin(newPin)
    if (newPin.length === 4) {
      handleSubmit(newPin)
    }
  }

  function handleBackspace() {
    if (isSubmitting) return
    setPin(prev => prev.slice(0, -1))
  }

  function handleSelectStaff(staffId: string) {
    setSelectedStaffId(staffId)
    setPin('')
    setError(null)
  }

  function handleChangeStaff() {
    setSelectedStaffId(null)
    setPin('')
    setError(null)
  }

  const padButtons = [
    '1', '2', '3',
    '4', '5', '6',
    '7', '8', '9',
    '', '0', 'DEL',
  ]

  return (
    <div className="flex flex-col items-center justify-center h-full bg-navy-dark px-4">
      {/* Store name */}
      <h1 className="font-display text-2xl font-bold text-white mb-2">{storeName}</h1>
      <p className="text-text-light text-sm mb-8">Staff Login</p>

      <div className="bg-card rounded-lg p-8 w-full max-w-96 shadow-lg">
        {/* Staff selector */}
        {!selectedStaffId && (
          <div>
            <p className="text-sm font-medium text-text mb-2">Select Staff</p>
            {staffList.length === 0 ? (
              <p className="text-text-muted text-sm text-center py-4">No staff members found.</p>
            ) : (
              <div className="max-h-60 overflow-y-auto space-y-2 mb-6">
                {staffList.map(staff => (
                  <button
                    key={staff.id}
                    onClick={() => handleSelectStaff(staff.id)}
                    className="w-full py-3 px-4 rounded-md text-left text-base font-medium transition-colors duration-150 bg-surface text-text hover:bg-border"
                  >
                    {staff.name}
                    {staff.role === 'owner' && (
                      <span className="ml-2 text-text-muted text-sm">(Owner)</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PIN pad — shown only when staff is selected */}
        {selectedStaffId && (
          <div>
            {/* Selected staff name */}
            <p className="text-sm font-medium text-text mb-4 text-center">
              {staffList.find(s => s.id === selectedStaffId)?.name}
            </p>

            {/* 4 dot PIN indicator */}
            <div className="flex justify-center gap-3 mb-6">
              {[0, 1, 2, 3].map(i => (
                <div
                  key={i}
                  className={`w-4 h-4 rounded-full transition-colors duration-100 ${
                    isSubmitting
                      ? 'bg-navy animate-pulse'
                      : i < pin.length
                      ? 'bg-navy'
                      : 'bg-border'
                  }`}
                />
              ))}
            </div>

            {/* Numeric keypad */}
            <div
              className={`grid grid-cols-3 gap-3 ${isSubmitting ? 'opacity-50 pointer-events-none' : ''}`}
            >
              {padButtons.map((btn, idx) => {
                if (btn === '') {
                  return <div key={idx} />
                }
                if (btn === 'DEL') {
                  return (
                    <button
                      key={idx}
                      onClick={handleBackspace}
                      disabled={isSubmitting}
                      className="h-14 w-full rounded-md bg-surface text-base font-semibold text-text-muted hover:bg-border active:bg-navy active:text-white transition-colors duration-50"
                    >
                      DEL
                    </button>
                  )
                }
                return (
                  <button
                    key={idx}
                    onClick={() => handleDigit(btn)}
                    disabled={isSubmitting}
                    className="h-14 w-full rounded-md bg-surface text-xl font-semibold text-text hover:bg-border active:bg-navy active:text-white transition-colors duration-50"
                  >
                    {btn}
                  </button>
                )
              })}
            </div>

            {/* Error display */}
            <div className="mt-4 min-h-[20px]">
              {error && (
                <p className="text-error text-sm text-center">{error}</p>
              )}
            </div>

            {/* Change staff button */}
            <div className="mt-4 text-center">
              <button
                onClick={handleChangeStaff}
                className="text-text-muted text-sm underline cursor-pointer"
              >
                Change staff member
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
