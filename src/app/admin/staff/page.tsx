import { getStaffList } from '@/actions/staff/getStaffList'
import StaffPageClient from '@/components/admin/staff/StaffPageClient'

export default async function StaffPage() {
  const result = await getStaffList()

  if ('error' in result) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-xl font-semibold font-sans text-text">Staff</h1>
          <p className="text-sm font-sans text-text-muted mt-1">
            Manage your team&apos;s access and PINs.
          </p>
        </div>
        <div className="flex items-center justify-center py-12 bg-card rounded-[var(--radius-md)] border border-border">
          <p className="text-sm font-sans text-text-muted">
            Couldn&apos;t load staff list. Refresh the page to try again.
          </p>
        </div>
      </div>
    )
  }

  return <StaffPageClient staff={result.data} />
}
