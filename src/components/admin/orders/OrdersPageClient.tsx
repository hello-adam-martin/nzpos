'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { formatNZD } from '@/lib/money'
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
  const [toast, setToast] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  // Auto-dismiss toast after 3 seconds
  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(timer)
  }, [toast])

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
    // Refund step is now handled inside OrderDetailDrawer via showRefundStep state
    // This prop is kept for backward compatibility but the drawer manages the flow internally
  }

  function handleRefundComplete(totalCents: number) {
    setSelectedOrder(null)
    router.refresh()
    setToast(`Refund processed. ${formatNZD(totalCents)} returned to customer.`)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Success toast */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-4 right-4 z-[100] bg-[var(--color-success)] text-white text-sm font-sans font-bold px-4 py-3 rounded-[var(--radius-md)] shadow-lg max-w-xs"
        >
          {toast}
        </div>
      )}
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
        onRefundComplete={handleRefundComplete}
      />
    </div>
  )
}
