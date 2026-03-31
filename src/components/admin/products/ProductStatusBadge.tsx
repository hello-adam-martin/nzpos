interface ProductStatusBadgeProps {
  isActive: boolean
  stockQuantity: number
  reorderThreshold: number
}

type BadgeVariant = 'active' | 'low-stock' | 'out-of-stock' | 'inactive'

function getBadgeVariant(
  isActive: boolean,
  stockQuantity: number,
  reorderThreshold: number
): BadgeVariant {
  if (!isActive) return 'inactive'
  if (stockQuantity === 0) return 'out-of-stock'
  if (stockQuantity <= reorderThreshold) return 'low-stock'
  return 'active'
}

const VARIANT_STYLES: Record<BadgeVariant, string> = {
  active: 'bg-success text-white',
  'low-stock': 'bg-warning text-white',
  'out-of-stock': 'bg-error text-white',
  inactive: 'border border-border text-text-muted',
}

const VARIANT_LABELS: Record<BadgeVariant, string> = {
  active: 'Active',
  'low-stock': 'Low Stock',
  'out-of-stock': 'Out of Stock',
  inactive: 'Inactive',
}

export default function ProductStatusBadge({
  isActive,
  stockQuantity,
  reorderThreshold,
}: ProductStatusBadgeProps) {
  const variant = getBadgeVariant(isActive, stockQuantity, reorderThreshold)

  return (
    <span
      className={[
        'inline-flex items-center rounded-full text-sm font-semibold font-sans',
        'px-2 py-1',
        VARIANT_STYLES[variant],
      ].join(' ')}
    >
      {VARIANT_LABELS[variant]}
    </span>
  )
}
