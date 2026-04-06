'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { X, Search, UserPlus, Loader2 } from 'lucide-react'
import { lookupCustomerForPOS, type CustomerPOSResult } from '@/actions/loyalty/lookupCustomerForPOS'
import { quickAddCustomer } from '@/actions/loyalty/quickAddCustomer'
import { formatLoyaltyDisplay } from '@/lib/loyalty-utils'

interface CustomerLookupSheetProps {
  isOpen: boolean
  onClose: () => void
  onCustomerSelected: (customer: { id: string; name: string; email: string; pointsBalance: number }) => void
  storeId: string
  redeemRateCents: number
}

type SheetState = 'search' | 'quick-add' | 'saving'

export function CustomerLookupSheet({
  isOpen,
  onClose,
  onCustomerSelected,
  storeId: _storeId,
  redeemRateCents,
}: CustomerLookupSheetProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [results, setResults] = useState<CustomerPOSResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [sheetState, setSheetState] = useState<SheetState>('search')
  const [searchError, setSearchError] = useState<string | null>(null)

  // Quick-add form state
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [consentGiven, setConsentGiven] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  const searchInputRef = useRef<HTMLInputElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto-focus search input when sheet opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50)
    } else {
      // Reset state when closed
      setSearchQuery('')
      setResults([])
      setHasSearched(false)
      setSheetState('search')
      setSearchError(null)
      setNewName('')
      setNewEmail('')
      setConsentGiven(false)
      setAddError(null)
    }
  }, [isOpen])

  // Focus name input when switching to quick-add
  useEffect(() => {
    if (sheetState === 'quick-add') {
      setTimeout(() => nameInputRef.current?.focus(), 50)
    }
  }, [sheetState])

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Debounced search with 300ms delay
  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query)
    setSearchError(null)

    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (query.length < 2) {
      setResults([])
      setHasSearched(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true)
      setHasSearched(true)
      const result = await lookupCustomerForPOS({ query })
      setIsSearching(false)
      if ('error' in result) {
        setSearchError(result.error)
        setResults([])
      } else {
        setResults(result.data)
      }
    }, 300)
  }, [])

  function handleSelectCustomer(customer: CustomerPOSResult) {
    onCustomerSelected({
      id: customer.id,
      name: customer.name,
      email: customer.email,
      pointsBalance: customer.points_balance,
    })
    onClose()
  }

  async function handleQuickAdd() {
    setAddError(null)
    if (!consentGiven) {
      setAddError('Please confirm the customer has been informed about loyalty data collection.')
      return
    }
    setSheetState('saving')
    const result = await quickAddCustomer({
      name: newName.trim(),
      email: newEmail.trim(),
      consent_given: true as const,
    })
    if ('error' in result) {
      setAddError(result.error)
      setSheetState('quick-add')
      return
    }
    // Either new customer or duplicate — attach either way
    onCustomerSelected({
      id: result.data.id,
      name: result.data.name,
      email: result.data.email,
      pointsBalance: 0, // New customers start at 0
    })
    onClose()
  }

  const isQuickAddValid = newName.trim().length > 0 && newEmail.trim().length > 0 && consentGiven
  const showNoMatch = hasSearched && !isSearching && results.length === 0 && sheetState === 'search'

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Slide-in panel from right */}
      <div
        className={[
          'fixed top-0 right-0 h-full w-80 bg-card shadow-xl z-50',
          'transform transition-transform duration-150 ease-out',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
        role="dialog"
        aria-modal="true"
        aria-label="Add customer"
      >
        <div className="flex flex-col h-full p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-text">
              {sheetState === 'quick-add' || sheetState === 'saving' ? 'New Customer' : 'Add Customer'}
            </h2>
            <button
              onClick={onClose}
              className="flex items-center justify-center w-11 h-11 rounded-lg text-text-muted hover:text-text hover:bg-surface"
              aria-label="Close customer lookup"
            >
              <X size={20} />
            </button>
          </div>

          {/* Search state */}
          {(sheetState === 'search') && (
            <>
              {/* Search input */}
              <div className="relative mb-3">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  inputMode="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Search by name or email..."
                  className="w-full min-h-[44px] pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-bg focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/20"
                  aria-label="Search customers"
                />
                {isSearching && (
                  <Loader2
                    size={16}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted animate-spin"
                  />
                )}
              </div>

              {/* Error message */}
              {searchError && (
                <p className="text-sm text-error mb-3" role="alert">
                  {searchError}
                </p>
              )}

              {/* Results list */}
              {results.length > 0 && (
                <div className="flex-1 min-h-0 overflow-y-auto space-y-1 mb-3">
                  {results.map((customer) => (
                    <button
                      key={customer.id}
                      type="button"
                      onClick={() => handleSelectCustomer(customer)}
                      className="w-full min-h-[44px] text-left px-3 py-2 rounded-lg hover:bg-surface transition-colors border border-transparent hover:border-border"
                    >
                      <p className="text-sm font-semibold text-text">{customer.name}</p>
                      <p className="text-xs text-text-muted">{customer.email}</p>
                      {customer.points_balance > 0 && (
                        <p className="text-xs text-amber font-medium mt-0.5">
                          {formatLoyaltyDisplay(customer.points_balance, redeemRateCents)}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* No match found */}
              {showNoMatch && (
                <div className="flex-1 flex flex-col items-center justify-start pt-4">
                  <p className="text-sm text-text-muted mb-3">No match found</p>
                  <button
                    type="button"
                    onClick={() => {
                      setNewName(searchQuery.includes('@') ? '' : searchQuery)
                      setNewEmail(searchQuery.includes('@') ? searchQuery : '')
                      setSheetState('quick-add')
                    }}
                    className="w-full min-h-[44px] flex items-center justify-center gap-2 text-sm font-semibold text-navy border border-border rounded-lg hover:bg-surface transition-colors"
                  >
                    <UserPlus size={16} />
                    Create new customer
                  </button>
                </div>
              )}

              {/* Hint when no search yet */}
              {!hasSearched && searchQuery.length < 2 && (
                <p className="text-xs text-text-muted text-center mt-4">
                  Type at least 2 characters to search
                </p>
              )}
            </>
          )}

          {/* Quick-add form */}
          {(sheetState === 'quick-add' || sheetState === 'saving') && (
            <div className="flex flex-col flex-1 min-h-0">
              {/* Name field */}
              <div className="mb-3">
                <label className="block text-sm text-text-muted mb-1" htmlFor="new-customer-name">
                  Name <span className="text-error">*</span>
                </label>
                <input
                  ref={nameInputRef}
                  id="new-customer-name"
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Full name"
                  className="w-full min-h-[44px] px-3 py-2 text-sm border border-border rounded-lg bg-bg focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/20"
                />
              </div>

              {/* Email field */}
              <div className="mb-4">
                <label className="block text-sm text-text-muted mb-1" htmlFor="new-customer-email">
                  Email <span className="text-error">*</span>
                </label>
                <input
                  id="new-customer-email"
                  type="email"
                  inputMode="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="customer@example.com"
                  className="w-full min-h-[44px] px-3 py-2 text-sm border border-border rounded-lg bg-bg focus:outline-none focus:border-navy focus:ring-2 focus:ring-navy/20"
                />
              </div>

              {/* Privacy consent checkbox — D-13/D-14 IPP 3A */}
              <label className="flex items-start gap-3 mb-4 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentGiven}
                  onChange={(e) => {
                    setConsentGiven(e.target.checked)
                    setAddError(null)
                  }}
                  className="mt-0.5 w-5 h-5 rounded border-border text-navy focus:ring-navy/20 flex-shrink-0"
                />
                <span className="text-sm text-text leading-snug">
                  Customer has been informed about loyalty data collection
                </span>
              </label>

              {/* Add error */}
              {addError && (
                <p className="text-sm text-error mb-3" role="alert">
                  {addError}
                </p>
              )}

              <div className="flex-1" />

              {/* Save button */}
              <button
                type="button"
                onClick={handleQuickAdd}
                disabled={!isQuickAddValid || sheetState === 'saving'}
                className={[
                  'w-full min-h-[48px] bg-navy text-white text-base font-bold rounded-lg mb-3 transition-opacity',
                  (!isQuickAddValid || sheetState === 'saving') ? 'opacity-50 pointer-events-none' : 'hover:opacity-90',
                ].join(' ')}
              >
                {sheetState === 'saving' ? 'Saving…' : 'Save Customer'}
              </button>

              {/* Back to search */}
              <button
                type="button"
                onClick={() => {
                  setSheetState('search')
                  setAddError(null)
                }}
                className="w-full min-h-[44px] border border-border text-navy text-sm font-semibold rounded-lg hover:bg-surface transition-colors"
              >
                Back to search
              </button>
            </div>
          )}

          {/* Skip link — always visible at bottom in search state */}
          {sheetState === 'search' && (
            <div className="mt-auto pt-3 border-t border-border">
              <button
                type="button"
                onClick={onClose}
                className="w-full min-h-[44px] text-sm text-text-muted hover:text-text transition-colors"
              >
                Skip — continue without customer
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
