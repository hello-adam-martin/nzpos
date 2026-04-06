'use client'
import { useRouter } from 'next/navigation'
import type { CustomerListItem } from '@/actions/customers/getCustomers'

interface CustomerTableProps {
  customers: CustomerListItem[]
  hasLoyaltyPoints?: boolean
}

export default function CustomerTable({ customers, hasLoyaltyPoints = false }: CustomerTableProps) {
  const router = useRouter()

  if (customers.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-[var(--color-text-muted)]">No customers match your search.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-[var(--color-border)]">
            <th className="text-left text-sm uppercase tracking-wide font-bold text-[var(--color-text-muted)] py-2 pr-4">
              Name
            </th>
            <th className="text-left text-sm uppercase tracking-wide font-bold text-[var(--color-text-muted)] py-2 pr-4">
              Email
            </th>
            <th className="text-left text-sm uppercase tracking-wide font-bold text-[var(--color-text-muted)] py-2 pr-4">
              Orders
            </th>
            {hasLoyaltyPoints && (
              <th className="text-right text-sm uppercase tracking-wide font-bold text-[var(--color-text-muted)] py-2 pr-4">
                Points
              </th>
            )}
            <th className="text-left text-sm uppercase tracking-wide font-bold text-[var(--color-text-muted)] py-2">
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          {customers.map((customer) => (
            <tr
              key={customer.id}
              onClick={() => router.push('/admin/customers/' + customer.id)}
              className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface)]/50 transition-colors duration-75 cursor-pointer min-h-[40px]"
            >
              <td className="py-2.5 pr-4 text-sm text-[var(--color-text)] font-sans">
                {customer.name ?? '—'}
              </td>
              <td className="py-2.5 pr-4 text-sm text-[var(--color-text)] font-sans">
                {customer.email}
              </td>
              <td className="py-2.5 pr-4 text-sm text-[var(--color-text)] font-sans">
                {customer.orderCount}
              </td>
              {hasLoyaltyPoints && (
                <td className="py-2.5 pr-4 text-sm text-right text-[var(--color-text)] font-sans tabular-nums">
                  {customer.points_balance}
                </td>
              )}
              <td className="py-2.5">
                {customer.is_active ? (
                  <span className="inline-flex items-center bg-[var(--color-success)]/10 text-[var(--color-success)] rounded-full text-xs font-bold px-2 py-0.5">
                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center bg-[var(--color-error)]/10 text-[var(--color-error)] rounded-full text-xs font-bold px-2 py-0.5">
                    Disabled
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
