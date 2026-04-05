'use client'
import { useState, useTransition } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getCustomerDetail } from '@/actions/customers/getCustomerDetail'
import type { CustomerDetail, CustomerOrder } from '@/actions/customers/getCustomerDetail'
import { disableCustomer } from '@/actions/customers/disableCustomer'
import { enableCustomer } from '@/actions/customers/enableCustomer'
import { formatNZD } from '@/lib/money'
import DisableCustomerModal from '@/components/admin/customers/DisableCustomerModal'
import { useEffect } from 'react'

const ORDER_PAGE_SIZE = 10

function StatusBadge({ status }: { status: string }) {
  const lower = status.toLowerCase()
  if (lower === 'completed' || lower === 'collected') {
    return (
      <span className="inline-flex items-center bg-[var(--color-success)]/10 text-[var(--color-success)] rounded-full text-xs font-bold px-2 py-0.5">
        {status}
      </span>
    )
  }
  if (lower === 'refunded') {
    return (
      <span className="inline-flex items-center bg-[var(--color-error)]/10 text-[var(--color-error)] rounded-full text-xs font-bold px-2 py-0.5">
        {status}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center bg-[var(--color-warning)]/10 text-[var(--color-warning)] rounded-full text-xs font-bold px-2 py-0.5">
      {status}
    </span>
  )
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-NZ', { day: '2-digit', month: 'short', year: 'numeric' })
}

function OrderTable({ orders }: { orders: CustomerOrder[] }) {
  const [page, setPage] = useState(0)

  if (orders.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-[var(--color-text-muted)]">No orders yet.</p>
      </div>
    )
  }

  const paged = orders.slice(page * ORDER_PAGE_SIZE, (page + 1) * ORDER_PAGE_SIZE)
  const totalPages = Math.ceil(orders.length / ORDER_PAGE_SIZE)

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-[var(--color-border)]">
              <th className="text-left text-sm uppercase tracking-wide font-bold text-[var(--color-text-muted)] py-2 pr-4">
                Order #
              </th>
              <th className="text-left text-sm uppercase tracking-wide font-bold text-[var(--color-text-muted)] py-2 pr-4">
                Date
              </th>
              <th className="text-left text-sm uppercase tracking-wide font-bold text-[var(--color-text-muted)] py-2 pr-4">
                Total
              </th>
              <th className="text-left text-sm uppercase tracking-wide font-bold text-[var(--color-text-muted)] py-2">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {paged.map((order) => (
              <tr key={order.id} className="border-b border-[var(--color-border)]">
                {/* order_number column absent from schema — displaying short UUID as order reference */}
                <td className="py-2.5 pr-4 font-mono text-sm text-[var(--color-text)]">
                  #{order.id.slice(0, 8).toUpperCase()}
                </td>
                <td className="py-2.5 pr-4 text-sm text-[var(--color-text-muted)] font-sans">
                  {formatDate(order.created_at)}
                </td>
                <td className="py-2.5 pr-4 text-sm text-[var(--color-text)] font-sans">
                  {formatNZD(order.total_cents)}
                </td>
                <td className="py-2.5">
                  <StatusBadge status={order.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {orders.length > ORDER_PAGE_SIZE && (
        <div className="flex items-center justify-between text-sm text-[var(--color-text-muted)] font-sans">
          <span>
            Showing {page * ORDER_PAGE_SIZE + 1}–{Math.min((page + 1) * ORDER_PAGE_SIZE, orders.length)} of {orders.length} orders
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1 rounded-md border border-[var(--color-border)] text-sm font-sans disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--color-surface)] transition-colors"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1 rounded-md border border-[var(--color-border)] text-sm font-sans disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--color-surface)] transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function CustomerDetailHeader({
  customer,
  onDisableSuccess,
}: {
  customer: CustomerDetail
  onDisableSuccess: () => void
}) {
  const [showModal, setShowModal] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [isActive, setIsActive] = useState(customer.is_active)

  function handleEnable() {
    startTransition(async () => {
      const result = await enableCustomer({ customerId: customer.id })
      if ('error' in result) return
      setIsActive(true)
      onDisableSuccess()
    })
  }

  function handleDisableSuccess() {
    setShowModal(false)
    setIsActive(false)
    onDisableSuccess()
  }

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold font-display text-[var(--color-text)]">
            {customer.name ?? customer.email}
          </h1>
          <p className="text-sm text-[var(--color-text-muted)] font-sans">{customer.email}</p>
          <div className="flex items-center gap-2 mt-1">
            {isActive ? (
              <span className="inline-flex items-center bg-[var(--color-success)]/10 text-[var(--color-success)] rounded-full text-xs font-bold px-2 py-0.5">
                Active
              </span>
            ) : (
              <span className="inline-flex items-center bg-[var(--color-error)]/10 text-[var(--color-error)] rounded-full text-xs font-bold px-2 py-0.5">
                Disabled
              </span>
            )}
            <span className="text-sm text-[var(--color-text-muted)] font-sans">
              Joined {formatDate(customer.created_at)}
            </span>
          </div>
        </div>

        <div className="shrink-0">
          {isActive ? (
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="px-4 py-2 rounded-md bg-[var(--color-navy)] text-white text-sm font-bold font-sans hover:opacity-90 transition-opacity"
            >
              Disable Account
            </button>
          ) : (
            <button
              type="button"
              onClick={handleEnable}
              disabled={isPending}
              className="px-4 py-2 rounded-md border border-[var(--color-navy)] text-[var(--color-navy)] text-sm font-bold font-sans hover:bg-[var(--color-navy)]/5 transition-colors disabled:opacity-60"
            >
              {isPending ? 'Enabling...' : 'Enable Account'}
            </button>
          )}
        </div>
      </div>

      {showModal && (
        <DisableCustomerModal
          customerName={customer.name ?? customer.email}
          customerId={customer.id}
          onClose={handleDisableSuccess}
        />
      )}
    </>
  )
}

export default function CustomerDetailPage() {
  const params = useParams()
  const router = useRouter()
  const customerId = params.id as string

  const [customer, setCustomer] = useState<CustomerDetail | null>(null)
  const [orders, setOrders] = useState<CustomerOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function loadData() {
    setLoading(true)
    const result = await getCustomerDetail(customerId)
    setLoading(false)
    if ('error' in result) {
      setError(result.error)
      return
    }
    setCustomer(result.data.customer)
    setOrders(result.data.orders)
  }

  useEffect(() => {
    loadData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId])

  if (loading) {
    return (
      <div className="flex flex-col gap-[var(--space-xl)]">
        {/* Skeleton header */}
        <div className="h-20 bg-[var(--color-surface)] animate-pulse rounded-[var(--radius-md)]" />
        {/* Skeleton table */}
        <div className="h-48 bg-[var(--color-surface)] animate-pulse rounded-[var(--radius-md)]" />
      </div>
    )
  }

  if (error || !customer) {
    return (
      <div className="flex flex-col gap-4">
        <button
          type="button"
          onClick={() => router.push('/admin/customers')}
          className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] font-sans w-fit"
        >
          ← Back to Customers
        </button>
        <p className="text-sm text-[var(--color-error)]">
          {error ?? 'Customer not found.'}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-[var(--space-xl)]">
      {/* Back link */}
      <button
        type="button"
        onClick={() => router.push('/admin/customers')}
        className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] font-sans w-fit transition-colors"
      >
        ← Back to Customers
      </button>

      {/* Profile header */}
      <div className="bg-[var(--color-card)] rounded-[var(--radius-lg)] border border-[var(--color-border)] p-[var(--space-xl)]">
        <CustomerDetailHeader
          customer={customer}
          onDisableSuccess={loadData}
        />
      </div>

      {/* Order history */}
      <div className="bg-[var(--color-card)] rounded-[var(--radius-lg)] border border-[var(--color-border)] p-[var(--space-xl)]">
        <h2 className="text-base font-bold font-sans text-[var(--color-text)] mb-[var(--space-lg)]">
          Order History
        </h2>
        <OrderTable orders={orders} />
      </div>
    </div>
  )
}
