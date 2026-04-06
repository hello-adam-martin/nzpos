'use client'

type GiftCardStatus = 'active' | 'redeemed' | 'expired' | 'voided'

interface GiftCardStatusBadgeProps {
  status: GiftCardStatus
}

const STATUS_STYLES: Record<GiftCardStatus, string> = {
  active: 'bg-[#ECFDF5] text-[#059669]',
  redeemed: 'bg-[#F0F9FF] text-[#0284C7]',
  expired: 'bg-[#FEF3C7] text-[#D97706]',
  voided: 'bg-[#FEF2F2] text-[#DC2626]',
}

const STATUS_LABELS: Record<GiftCardStatus, string> = {
  active: 'Active',
  redeemed: 'Redeemed',
  expired: 'Expired',
  voided: 'Voided',
}

export function GiftCardStatusBadge({ status }: GiftCardStatusBadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center px-2 py-0.5 rounded-full text-[14px] font-medium capitalize',
        STATUS_STYLES[status],
      ].join(' ')}
    >
      {STATUS_LABELS[status]}
    </span>
  )
}
