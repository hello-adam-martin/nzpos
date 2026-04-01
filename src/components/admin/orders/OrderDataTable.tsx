'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { formatNZD } from '@/lib/money'
import { OrderStatusBadge } from './OrderStatusBadge'
import { ChannelBadge } from './ChannelBadge'

export type OrderItem = {
  id: string
  product_name: string
  unit_price_cents: number
  quantity: number
  discount_cents: number
  line_total_cents: number
  gst_cents: number
}

export type OrderWithStaff = {
  id: string
  created_at: string
  total_cents: number
  channel: 'pos' | 'online'
  payment_method: string | null
  status: string
  staff: { name: string } | null
  order_items: OrderItem[]
  subtotal_cents: number
  gst_cents: number
  discount_cents: number
  stripe_payment_intent_id: string | null
  customer_email: string | null
  notes: string | null
}

type SortColumn = 'created_at' | 'total_cents' | 'status'

const NZ_DATE_FORMAT = new Intl.DateTimeFormat('en-NZ', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

function SortIcon({ column, current, dir }: { column: SortColumn; current: SortColumn | null; dir: 'asc' | 'desc' }) {
  if (current !== column) {
    return (
      <svg className="w-3.5 h-3.5 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
      </svg>
    )
  }
  if (dir === 'asc') {
    return (
      <svg className="w-3.5 h-3.5 text-amber" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
      </svg>
    )
  }
  return (
    <svg className="w-3.5 h-3.5 text-amber" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  )
}

interface OrderDataTableProps {
  orders: OrderWithStaff[]
  onSelectOrder: (order: OrderWithStaff) => void
  hasFilters: boolean
}

export function OrderDataTable({ orders, onSelectOrder, hasFilters }: OrderDataTableProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const currentSort = (searchParams.get('sort') as SortColumn | null) ?? null
  const currentDir = (searchParams.get('dir') as 'asc' | 'desc') ?? 'desc'

  function handleSort(column: SortColumn) {
    const params = new URLSearchParams(searchParams.toString())
    if (currentSort === column) {
      // Toggle direction
      params.set('dir', currentDir === 'asc' ? 'desc' : 'asc')
    } else {
      params.set('sort', column)
      params.set('dir', 'desc')
    }
    params.delete('page')
    router.push(`?${params.toString()}`)
  }

  const SORTABLE_COLUMNS: { key: SortColumn; label: string }[] = [
    { key: 'created_at', label: 'Date / Time' },
    { key: 'total_cents', label: 'Total' },
    { key: 'status', label: 'Status' },
  ]

  if (orders.length === 0) {
    if (!hasFilters) {
      return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="text-text-muted mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="text-xl font-bold font-sans text-text mb-2">No orders yet</h3>
          <p className="text-base font-sans text-text-muted">
            Orders will appear here once sales are made in-store or online.
          </p>
        </div>
      )
    }

    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="text-text-muted mb-4">
          <svg className="w-12 h-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
        </div>
        <h3 className="text-xl font-bold font-sans text-text mb-2">No orders match your filters</h3>
        <p className="text-base font-sans text-text-muted">
          Try adjusting or clearing them.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-[var(--radius-md)] border border-border">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-navy text-white">
            {/* Order ID */}
            <th className="px-3 py-3 text-left text-sm font-bold font-sans">
              Order ID
            </th>

            {/* Date/Time — sortable */}
            <th className="px-3 py-3 text-left">
              <button
                type="button"
                onClick={() => handleSort('created_at')}
                className="flex items-center gap-1 text-sm font-bold font-sans text-white hover:text-white/80 transition-colors"
              >
                {SORTABLE_COLUMNS[0].label}
                <SortIcon column="created_at" current={currentSort} dir={currentDir} />
              </button>
            </th>

            {/* Total — sortable */}
            <th className="px-3 py-3 text-left">
              <button
                type="button"
                onClick={() => handleSort('total_cents')}
                className="flex items-center gap-1 text-sm font-bold font-sans text-white hover:text-white/80 transition-colors"
              >
                {SORTABLE_COLUMNS[1].label}
                <SortIcon column="total_cents" current={currentSort} dir={currentDir} />
              </button>
            </th>

            {/* Channel */}
            <th className="px-3 py-3 text-left text-sm font-bold font-sans">
              Channel
            </th>

            {/* Payment */}
            <th className="px-3 py-3 text-left text-sm font-bold font-sans">
              Payment
            </th>

            {/* Status — sortable */}
            <th className="px-3 py-3 text-left">
              <button
                type="button"
                onClick={() => handleSort('status')}
                className="flex items-center gap-1 text-sm font-bold font-sans text-white hover:text-white/80 transition-colors"
              >
                {SORTABLE_COLUMNS[2].label}
                <SortIcon column="status" current={currentSort} dir={currentDir} />
              </button>
            </th>

            {/* Staff */}
            <th className="px-3 py-3 text-left text-sm font-bold font-sans">
              Staff
            </th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr
              key={order.id}
              onClick={() => onSelectOrder(order)}
              className="min-h-[48px] border-t border-border cursor-pointer transition-colors hover:bg-surface"
            >
              {/* Order ID — first 8 chars, mono */}
              <td className="px-3 py-3">
                <span className="text-sm font-mono text-text">
                  {order.id.slice(0, 8)}
                </span>
              </td>

              {/* Date/Time */}
              <td className="px-3 py-3">
                <span className="text-sm font-sans text-text">
                  {NZ_DATE_FORMAT.format(new Date(order.created_at))}
                </span>
              </td>

              {/* Total */}
              <td className="px-3 py-3">
                <span
                  className="text-sm font-mono text-text"
                  style={{ fontFeatureSettings: "'tnum' 1" }}
                >
                  {formatNZD(order.total_cents)}
                </span>
              </td>

              {/* Channel */}
              <td className="px-3 py-3">
                <ChannelBadge channel={order.channel} />
              </td>

              {/* Payment method */}
              <td className="px-3 py-3">
                <span className="text-sm font-sans text-text-muted capitalize">
                  {order.payment_method ?? '-'}
                </span>
              </td>

              {/* Status */}
              <td className="px-3 py-3">
                <OrderStatusBadge status={order.status as Parameters<typeof OrderStatusBadge>[0]['status']} />
              </td>

              {/* Staff */}
              <td className="px-3 py-3">
                <span className="text-sm font-sans text-text-muted">
                  {order.staff?.name ?? '-'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
