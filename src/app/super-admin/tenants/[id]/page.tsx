import { notFound } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { ADDONS } from '@/config/addons'
import TenantStatusBadge from '@/components/super-admin/TenantStatusBadge'
import PlanOverrideRow from '@/components/super-admin/PlanOverrideRow'
import AuditLogList from '@/components/super-admin/AuditLogList'
import TenantDetailActions from './TenantDetailActions'

export const dynamic = 'force-dynamic'

export default async function TenantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const admin = createSupabaseAdminClient()

  // Fetch store, plans, latest order, and audit log in parallel
  const [storeResult, plansResult, latestOrderResult, auditResult] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any)
      .from('stores')
      .select('id, name, slug, is_active, created_at, suspended_at, suspension_reason')
      .eq('id', id)
      .single(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any)
      .from('store_plans')
      .select(
        'has_xero, has_email_notifications, has_custom_domain, has_xero_manual_override, has_email_notifications_manual_override, has_custom_domain_manual_override'
      )
      .eq('store_id', id)
      .single(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any)
      .from('orders')
      .select('created_at')
      .eq('store_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any)
      .from('super_admin_actions')
      .select('id, action, note, created_at, super_admin_user_id')
      .eq('store_id', id)
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  if (storeResult.error || !storeResult.data) {
    notFound()
  }

  const store = storeResult.data
  const plans = plansResult.data ?? {}
  const latestOrder = latestOrderResult.data
  const auditActions = auditResult.data ?? []

  return (
    <div>
      {/* Page header */}
      <div className="mb-6">
        <Link
          href="/super-admin/tenants"
          className="inline-flex items-center gap-1 text-sm font-sans text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors duration-150 mb-3"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10 12L6 8l4-4" />
          </svg>
          Back to tenants
        </Link>
        <h1 className="font-display text-2xl font-semibold text-[var(--color-text)]">
          {store.name}
        </h1>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-3 gap-6">
        {/* Left column — main content (col-span-2) */}
        <div className="col-span-2 space-y-6">

          {/* Store Information card */}
          <div className="bg-white shadow-sm rounded-[var(--radius-md)] p-6">
            <h2 className="font-display text-xl font-semibold text-[var(--color-text)] mb-4">
              Store Information
            </h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold font-sans text-[var(--color-text-muted)] mb-0.5">Store Name</p>
                <p className="text-base font-sans text-[var(--color-text)]">{store.name}</p>
              </div>
              <div>
                <p className="text-sm font-semibold font-sans text-[var(--color-text-muted)] mb-0.5">Slug</p>
                <p className="font-mono text-sm text-[var(--color-text)]">{store.slug}</p>
              </div>
              <div>
                <p className="text-sm font-semibold font-sans text-[var(--color-text-muted)] mb-0.5">Created</p>
                <p className="text-base font-sans text-[var(--color-text-muted)]">
                  {format(new Date(store.created_at), 'd MMM yyyy')}
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold font-sans text-[var(--color-text-muted)] mb-0.5">Last order</p>
                <p className="text-base font-sans text-[var(--color-text-muted)]">
                  {latestOrder
                    ? format(new Date(latestOrder.created_at), 'd MMM yyyy')
                    : 'No orders yet'}
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold font-sans text-[var(--color-text-muted)] mb-0.5">Status</p>
                <TenantStatusBadge isActive={store.is_active} />
              </div>
            </div>
          </div>

          {/* Add-ons card */}
          <div className="bg-white shadow-sm rounded-[var(--radius-md)] p-6">
            <h2 className="font-display text-xl font-semibold text-[var(--color-text)] mb-4">
              Add-ons
            </h2>
            <div>
              {ADDONS.map((addon) => {
                const col = `has_${addon.feature}` as keyof typeof plans
                const overrideCol = `has_${addon.feature}_manual_override` as keyof typeof plans
                return (
                  <PlanOverrideRow
                    key={addon.feature}
                    storeId={id}
                    feature={addon.feature}
                    name={addon.name}
                    isActive={Boolean(plans[col])}
                    isManualOverride={Boolean(plans[overrideCol])}
                  />
                )
              })}
            </div>
          </div>

          {/* Recent Actions card */}
          <div className="bg-white shadow-sm rounded-[var(--radius-md)] p-6">
            <h2 className="font-display text-xl font-semibold text-[var(--color-text)] mb-4">
              Recent Actions
            </h2>
            <AuditLogList actions={auditActions} />
          </div>
        </div>

        {/* Right column — actions (col-span-1) */}
        <div className="col-span-1">
          <div className="bg-white shadow-sm rounded-[var(--radius-md)] p-6">
            <h2 className="font-display text-xl font-semibold text-[var(--color-text)] mb-4">
              Actions
            </h2>
            <TenantDetailActions
              storeId={store.id}
              storeName={store.name}
              isActive={store.is_active}
            />
            <div className="mt-4">
              <Link
                href="/super-admin/tenants"
                className="inline-flex items-center gap-1 text-sm font-sans text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors duration-150"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10 12L6 8l4-4" />
                </svg>
                Back to tenants
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
