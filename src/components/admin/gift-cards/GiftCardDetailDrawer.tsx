'use client'
import { useEffect, useState, useRef, useTransition } from 'react'
import { formatNZD } from '@/lib/money'
import { GiftCardStatusBadge } from './GiftCardStatusBadge'
import { getGiftCard, type GiftCardDetail } from '@/actions/gift-cards/getGiftCard'
import { voidGiftCard } from '@/actions/gift-cards/voidGiftCard'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const NZ_DATE_LONG = new Intl.DateTimeFormat('en-NZ', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

const NZ_DATETIME = new Intl.DateTimeFormat('en-NZ', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

function ChannelBadge({ channel }: { channel: string }) {
  const isPos = channel === 'pos'
  return (
    <span
      className={[
        'inline-flex items-center px-2 py-0.5 rounded-full text-[14px] font-medium capitalize',
        isPos
          ? 'bg-navy/10 text-navy'
          : 'bg-[#F0F9FF] text-[#0284C7]',
      ].join(' ')}
    >
      {isPos ? 'POS' : 'Online'}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Skeleton loader
// ---------------------------------------------------------------------------

function DrawerSkeleton() {
  return (
    <div className="animate-pulse p-6 space-y-6">
      <div className="h-7 w-40 bg-surface rounded" />
      <div className="grid grid-cols-2 gap-4">
        <div className="h-14 bg-surface rounded" />
        <div className="h-14 bg-surface rounded" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-surface rounded" />
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface GiftCardDetailDrawerProps {
  giftCardId: string | null
  onClose: () => void
  role: 'owner' | 'manager'
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GiftCardDetailDrawer({ giftCardId, onClose, role }: GiftCardDetailDrawerProps) {
  const [card, setCard] = useState<GiftCardDetail | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Void state
  const [showVoidForm, setShowVoidForm] = useState(false)
  const [voidReason, setVoidReason] = useState('')
  const [voidError, setVoidError] = useState<string | null>(null)
  const [isPendingVoid, startVoidTransition] = useTransition()

  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const isOpen = giftCardId !== null

  // Focus management — focus close button when drawer opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => closeButtonRef.current?.focus(), 300)
    }
  }, [isOpen])

  // Escape key handler
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Fetch card data when drawer opens
  useEffect(() => {
    if (!giftCardId) {
      setCard(null)
      setFetchError(null)
      setShowVoidForm(false)
      setVoidReason('')
      setVoidError(null)
      return
    }

    setIsLoading(true)
    setFetchError(null)
    setShowVoidForm(false)
    setVoidReason('')
    setVoidError(null)

    getGiftCard({ giftCardId }).then((result) => {
      setIsLoading(false)
      if (result.success) {
        setCard(result.data)
      } else {
        setFetchError(result.error)
      }
    })
  }, [giftCardId])

  async function handleVoidConfirm() {
    if (!giftCardId || voidReason.trim().length < 4) return

    startVoidTransition(async () => {
      setVoidError(null)
      const result = await voidGiftCard({ giftCardId, reason: voidReason.trim() })
      if (result.success) {
        // Refresh card data
        const refreshed = await getGiftCard({ giftCardId })
        if (refreshed.success) {
          setCard(refreshed.data)
        }
        setShowVoidForm(false)
        setVoidReason('')
      } else {
        setVoidError(result.error)
      }
    })
  }

  // Can owner void this card?
  const canVoid = role === 'owner' && card?.status === 'active'

  return (
    <>
      {/* Overlay */}
      <div
        className={[
          'fixed inset-0 bg-black/40 z-40 transition-opacity duration-200',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        ].join(' ')}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        className={[
          'fixed right-0 top-0 h-full bg-card z-50 overflow-y-auto shadow-xl',
          'w-full sm:w-[480px]',
          'transition-transform ease-out duration-[250ms]',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
        role="dialog"
        aria-modal="true"
        aria-label="Gift card detail"
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-border flex-shrink-0 gap-3">
          <div className="flex flex-col gap-1 min-w-0">
            {card ? (
              <>
                <p className="text-[20px] font-semibold font-mono text-text tracking-[0.05em] leading-[1.3]">
                  {card.code}
                </p>
                <GiftCardStatusBadge status={card.status} />
              </>
            ) : (
              <div className="h-7 w-36 bg-surface rounded animate-pulse" />
            )}
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-md)] text-text-muted hover:text-text hover:bg-surface transition-colors flex-shrink-0 mt-0.5"
            aria-label="Close drawer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        {isLoading && <DrawerSkeleton />}

        {fetchError && (
          <div className="px-6 py-8 text-center">
            <p className="text-sm font-sans text-[var(--color-error)]">{fetchError}</p>
          </div>
        )}

        {!isLoading && !fetchError && card && (
          <div className="flex flex-col h-[calc(100%-73px)]">
            <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-6">

              {/* Balance section — 2-column stats */}
              <section>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[14px] font-medium font-sans text-text-muted mb-1">Original value</p>
                    <p
                      className="text-[20px] font-semibold font-sans text-text leading-[1.3]"
                      style={{ fontFeatureSettings: "'tnum' 1" }}
                    >
                      {formatNZD(card.original_value_cents)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[14px] font-medium font-sans text-text-muted mb-1">Remaining balance</p>
                    <p
                      className="text-[20px] font-semibold font-sans text-text leading-[1.3]"
                      style={{ fontFeatureSettings: "'tnum' 1" }}
                    >
                      {formatNZD(card.balance_cents)}
                    </p>
                  </div>
                </div>
                <p className="text-[14px] font-sans text-text-muted mt-3">
                  Expires {NZ_DATE_LONG.format(new Date(card.expires_at))}
                </p>
                {card.buyer_email && (
                  <p className="text-[14px] font-sans text-text-muted mt-1">
                    Buyer: {card.buyer_email}
                  </p>
                )}
              </section>

              {/* Transaction timeline */}
              <section>
                <h3 className="text-sm font-bold font-sans text-text mb-4">Transaction History</h3>
                <div className="relative">
                  {/* Vertical connector line */}
                  <div className="absolute left-4 top-5 bottom-5 w-px bg-border" aria-hidden="true" />

                  <div className="space-y-4">
                    {/* Issuance event */}
                    <div className="flex gap-4 items-start">
                      <div className="w-8 h-8 rounded-full bg-navy/10 flex items-center justify-center flex-shrink-0 relative z-10">
                        {/* Gift icon */}
                        <svg className="w-4 h-4 text-navy" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v13m0-13V6a4 4 0 00-4-4H6a4 4 0 00-4 4v2h20V6a4 4 0 00-4-4h-2a4 4 0 00-4 4v2M2 10h20v11a2 2 0 01-2 2H4a2 2 0 01-2-2V10z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0 pb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold font-sans text-text">Issued</span>
                          <span
                            className="text-sm font-mono text-text"
                            style={{ fontFeatureSettings: "'tnum' 1" }}
                          >
                            {formatNZD(card.original_value_cents)}
                          </span>
                          <ChannelBadge channel={card.purchase_channel} />
                        </div>
                        <p className="text-[14px] font-sans text-text-muted mt-0.5">
                          {NZ_DATETIME.format(new Date(card.issued_at))}
                        </p>
                      </div>
                    </div>

                    {/* Redemption events */}
                    {card.redemptions.map((r) => (
                      <div key={r.id} className="flex gap-4 items-start">
                        <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center flex-shrink-0 relative z-10 border border-border">
                          {/* Minus icon */}
                          <svg className="w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M18 12H6" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0 pb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold font-sans text-text">Redeemed</span>
                            <span
                              className="text-sm font-mono text-text"
                              style={{ fontFeatureSettings: "'tnum' 1" }}
                            >
                              -{formatNZD(r.amount_cents)}
                            </span>
                            <ChannelBadge channel={r.channel} />
                          </div>
                          <p className="text-[14px] font-sans text-text-muted mt-0.5">
                            Balance: {formatNZD(r.balance_after_cents)}
                            {r.staff_name && <span> &middot; {r.staff_name}</span>}
                          </p>
                          <p className="text-[14px] font-sans text-text-muted">
                            {NZ_DATETIME.format(new Date(r.redeemed_at))}
                          </p>
                        </div>
                      </div>
                    ))}

                    {/* Void event */}
                    {card.status === 'voided' && card.voided_at && (
                      <div className="flex gap-4 items-start">
                        <div className="w-8 h-8 rounded-full bg-[#FEF2F2] flex items-center justify-center flex-shrink-0 relative z-10">
                          {/* XCircle icon */}
                          <svg className="w-4 h-4 text-[#DC2626]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold font-sans text-[#DC2626]">Voided</span>
                          </div>
                          {card.void_reason && (
                            <p className="text-[14px] font-sans text-text-muted mt-0.5">
                              Reason: {card.void_reason}
                            </p>
                          )}
                          <p className="text-[14px] font-sans text-text-muted">
                            {NZ_DATETIME.format(new Date(card.voided_at))}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            </div>

            {/* Footer — Void action (owner + active only) */}
            {canVoid && (
              <div className="px-6 py-4 border-t border-border flex-shrink-0">
                {!showVoidForm ? (
                  <button
                    type="button"
                    onClick={() => setShowVoidForm(true)}
                    className="text-sm font-medium font-sans text-[var(--color-error)] hover:underline transition-colors"
                  >
                    Void Gift Card
                  </button>
                ) : (
                  <div
                    className="space-y-3"
                    style={{
                      animation: 'slideIn 150ms ease-out',
                    }}
                  >
                    <p className="text-sm font-sans text-text-muted">
                      This action cannot be undone. The remaining balance will be zeroed.
                    </p>
                    <input
                      type="text"
                      value={voidReason}
                      onChange={(e) => setVoidReason(e.target.value)}
                      placeholder="Reason for voiding (e.g. customer request)"
                      aria-required="true"
                      aria-label="Reason for voiding"
                      className="w-full px-3 py-2 border border-border rounded-[var(--radius-md)] text-sm font-sans text-text bg-card placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-[var(--color-error)]/30 focus:border-[var(--color-error)]"
                    />
                    {voidError && (
                      <p className="text-sm font-sans text-[var(--color-error)]">{voidError}</p>
                    )}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleVoidConfirm}
                        disabled={voidReason.trim().length <= 3 || isPendingVoid}
                        className="flex-1 py-2.5 px-4 bg-[#DC2626] text-white text-sm font-bold font-sans rounded-[var(--radius-md)] hover:bg-[#B91C1C] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isPendingVoid ? 'Voiding...' : 'Void Card'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowVoidForm(false)
                          setVoidReason('')
                          setVoidError(null)
                        }}
                        className="px-4 py-2.5 text-sm font-bold font-sans text-text hover:bg-surface border border-border rounded-[var(--radius-md)] transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  )
}
