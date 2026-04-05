import { getCustomers } from '@/actions/customers/getCustomers'
import CustomersPageClient from '@/components/admin/customers/CustomersPageClient'

export const dynamic = 'force-dynamic'

export default async function CustomersPage() {
  const result = await getCustomers()

  if ('error' in result) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-[var(--color-text)]">Customers</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">Manage your customer accounts.</p>
        </div>
        <p className="text-sm text-[var(--color-error)]">
          Couldn&apos;t load customers. Refresh the page to try again.
        </p>
      </div>
    )
  }

  return <CustomersPageClient customers={result.data} />
}
