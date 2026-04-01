'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { OrderFilterBar } from './OrderFilterBar'
import { OrderDataTable, type OrderWithStaff } from './OrderDataTable'
import { OrderDetailDrawer } from './OrderDetailDrawer'

interface OrdersPageClientProps {
  orders: OrderWithStaff[]
  totalCount: number
  currentPage: number
  pageSize: number
}

export function OrdersPageClient({
  orders,
  totalCount,
  currentPage,
  pageSize,
}: OrdersPageClientProps) {
  const [selectedOrder, setSelectedOrder] = useState<OrderWithStaff | null>(null)
  const [refundTargetOrder, setRefundTargetOrder] = useState<OrderWithStaff | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  const hasFilters =
    searchParams.has('status') ||
    searchParams.has('channel') ||
    searchParams.has('payment_method') ||
    searchParams.has('from') ||
    searchParams.has('to') ||
    searchParams.has('q')

  function goToPage(page: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(page))
    router.push(`?${params.toString()}`)
  }

  function handleDrawerClose() {
    setSelectedOrder(null)
  }

  function handleRefundClick() {
    // Refund flow handled in Plan 04 — store the target for future integration
    setRefundTargetOrder(selectedOrder)
    // For now: just close the drawer (actual refund in Plan 04)
    setSelectedOrder(null)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Filter bar */}
      <OrderFilterBar />

      {/* Data table */}
      <OrderDataTable
        orders={orders}
        onSelectOrder={setSelectedOrder}
        hasFilters={hasFilters}
      />

      {/* Pagination */}
      {totalCount > 0 && (
        <div className="flex items-center justify-between py-2">
          <p className="text-sm font-sans text-text-muted">
            Showing {Math.min((currentPage - 1) * pageSize + 1, totalCount)}–{Math.min(currentPage * pageSize, totalCount)} of {totalCount} orders
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage <= 1}
              className="px-3 py-1.5 text-sm font-sans border border-border rounded-[var(--radius-md)] text-text hover:bg-surface transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm font-sans text-text-muted">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="px-3 py-1.5 text-sm font-sans border border-border rounded-[var(--radius-md)] text-text hover:bg-surface transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Order detail drawer */}
      <OrderDetailDrawer
        order={selectedOrder}
        onClose={handleDrawerClose}
        onRefundClick={handleRefundClick}
      />
    </div>
  )
}
