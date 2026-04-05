import { notFound } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import type Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
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
      .select('id, name, slug, is_active, created_at, suspended_at, suspension_reason, stripe_customer_id, owner_auth_id')
      .eq('id', id)
      .single(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin as any)
      .from('store_plans')
      .select(
        'has_xero, has_email_notifications, has_custom_domain, has_inventory, has_xero_manual_override, has_email_notifications_manual_override, has_custom_domain_manual_override, has_inventory_manual_override'
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

  // Fetch Stripe billing + owner info in parallel (after store is loaded)
  let stripeSubscriptions: Stripe.Subscription[] = []
  let stripeInvoices: Stripe.Invoice[] = []
  let stripeError: string | null = null
  let ownerEmail: string | null = null
  let ownerCreatedAt: string | null = null

  const [stripeResult, ownerResult] = await Promise.allSettled([
    // Stripe billing (only if customer exists)
    store.stripe_customer_id
      ? Promise.all([
          stripe.subscriptions.list({ customer: store.stripe_customer_id, status: 'all', limit: 10 }),
          stripe.invoices.list({ customer: store.stripe_customer_id, limit: 10 }),
        ])
      : Promise.resolve(null),
    // Owner info
    store.owner_auth_id
      ? admin.auth.admin.getUserById(store.owner_auth_id)
      : Promise.resolve(null),
  ])

  if (stripeResult.status === 'fulfilled' && stripeResult.value) {
    const [subs, invs] = stripeResult.value
    stripeSubscriptions = subs.data
    stripeInvoices = invs.data
  } else if (stripeResult.status === 'rejected') {
    console.error('[TenantDetail] Stripe fetch failed:', stripeResult.reason)
    stripeError = 'Could not load billing data. Check the Stripe dashboard directly.'
  }

  if (ownerResult.status === 'fulfilled' && ownerResult.value && 'data' in ownerResult.value) {
    const ownerUser = ownerResult.value.data?.user
    if (ownerUser) {
      ownerEmail = ownerUser.email ?? null
      ownerCreatedAt = ownerUser.created_at ?? null
    }
  }

  // Compute payment failure alert (SA-BILL-03)
  // Invoice status does not include 'past_due'; detect overdue by status=open + due_date passed
  const hasPastDue =
    stripeSubscriptions.some((sub) => sub.status === 'past_due' || sub.status === 'unpaid') ||
    stripeInvoices.some(
      (inv) => inv.status === 'open' && inv.due_date && inv.due_date * 1000 < Date.now()
    )

  return (
    <div>
      {/* Payment failure warning banner */}
      {hasPastDue && (
        <div className="bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/30 rounded-[var(--radius-md)] py-4 px-4 mb-6">
          <div className="flex items-start gap-2">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mt-0.5 flex-shrink-0 text-[var(--color-warning)]">
              <path d="M8 1L15 14H1L8 1Z" stroke="currentColor" strokeWidth="1.5" fill="none" />
              <path d="M8 6v3M8 11v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <div>
              <p className="text-sm font-semibold font-sans text-[var(--color-text)]">Payment overdue</p>
              <p className="text-sm font-sans text-[var(--color-text-muted)]">This tenant has a past-due invoice. Their account may be restricted.</p>
            </div>
          </div>
        </div>
      )}

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
              {ownerEmail && (
                <div>
                  <p className="text-sm font-semibold font-sans text-[var(--color-text-muted)] mb-0.5">Owner Email</p>
                  <p className="font-mono text-sm text-[var(--color-text)]">{ownerEmail}</p>
                </div>
              )}
              {ownerCreatedAt && (
                <div>
                  <p className="text-sm font-semibold font-sans text-[var(--color-text-muted)] mb-0.5">Owner Signup</p>
                  <p className="text-base font-sans text-[var(--color-text-muted)]">
                    {format(new Date(ownerCreatedAt), 'd MMM yyyy')}
                  </p>
                </div>
              )}
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

          {/* Subscriptions card */}
          <div className="bg-white shadow-sm rounded-[var(--radius-md)] p-6">
            <h2 className="font-display text-xl font-semibold text-[var(--color-text)] mb-4">Subscriptions</h2>
            {stripeError ? (
              <p className="text-sm font-sans text-[var(--color-error)]">{stripeError}</p>
            ) : !store.stripe_customer_id ? (
              <p className="text-sm font-sans text-[var(--color-text-muted)]">No active subscriptions found for this tenant.</p>
            ) : stripeSubscriptions.length === 0 ? (
              <p className="text-sm font-sans text-[var(--color-text-muted)]">No active subscriptions found for this tenant.</p>
            ) : (
              <div className="space-y-3">
                {stripeSubscriptions.map((sub) => {
                  const item = sub.items.data[0]
                  const amount = item?.price?.unit_amount ?? 0
                  const interval = item?.price?.recurring?.interval ?? 'month'
                  const statusColors: Record<string, string> = {
                    active: 'bg-[var(--color-success)]/10 text-[var(--color-success)]',
                    trialing: 'bg-[var(--color-info)]/10 text-[var(--color-info)]',
                    canceled: 'bg-[var(--color-error)]/10 text-[var(--color-error)]',
                    past_due: 'bg-[var(--color-error)]/10 text-[var(--color-error)]',
                  }
                  return (
                    <div key={sub.id} className="flex items-center justify-between py-2 border-b border-[var(--color-border)] last:border-0">
                      <div>
                        <p className="text-sm font-semibold font-sans text-[var(--color-text)]">
                          {typeof item?.price?.product === 'object' && item.price.product && 'name' in item.price.product
                            ? (item.price.product as { name: string }).name
                            : 'Subscription'}
                        </p>
                        <p className="font-mono text-sm text-[var(--color-text-muted)]">
                          ${(amount / 100).toFixed(2)} / {interval}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full ${statusColors[sub.status] ?? 'bg-[var(--color-border)] text-[var(--color-text-muted)]'}`}>
                          {sub.status}
                        </span>
                        {sub.status === 'active' && sub.billing_cycle_anchor && (
                          <span className="text-sm font-sans text-[var(--color-text-muted)]">
                            Anchored {format(new Date(sub.billing_cycle_anchor * 1000), 'd MMM yyyy')}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Recent Invoices card */}
          <div className="bg-white shadow-sm rounded-[var(--radius-md)] p-6">
            <h2 className="font-display text-xl font-semibold text-[var(--color-text)] mb-4">Recent Invoices</h2>
            {stripeError ? (
              <p className="text-sm font-sans text-[var(--color-error)]">{stripeError}</p>
            ) : !store.stripe_customer_id ? (
              <p className="text-sm font-sans text-[var(--color-text-muted)]">No invoices found for this tenant.</p>
            ) : stripeInvoices.length === 0 ? (
              <p className="text-sm font-sans text-[var(--color-text-muted)]">No invoices found for this tenant.</p>
            ) : (
              <table className="w-full text-sm font-sans">
                <thead>
                  <tr className="text-xs font-semibold font-sans text-[var(--color-text-muted)] uppercase tracking-wider border-b border-[var(--color-border)]">
                    <th className="text-left pb-2">Date</th>
                    <th className="text-left pb-2">Description</th>
                    <th className="text-right pb-2">Amount</th>
                    <th className="text-right pb-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stripeInvoices.map((inv) => {
                    const invStatusColors: Record<string, string> = {
                      paid: 'bg-[var(--color-success)]/10 text-[var(--color-success)]',
                      open: 'bg-[var(--color-info)]/10 text-[var(--color-info)]',
                      void: 'bg-[var(--color-error)]/10 text-[var(--color-error)]',
                      uncollectible: 'bg-[var(--color-error)]/10 text-[var(--color-error)]',
                    }
                    const isOverdue = inv.status === 'open' && inv.due_date && inv.due_date * 1000 < Date.now()
                    const displayStatus = isOverdue ? 'past_due' : (inv.status ?? 'unknown')
                    const badgeColor = isOverdue
                      ? 'bg-[var(--color-error)]/10 text-[var(--color-error)]'
                      : (invStatusColors[inv.status ?? ''] ?? 'bg-[var(--color-border)] text-[var(--color-text-muted)]')
                    return (
                      <tr key={inv.id} className="border-b border-[var(--color-border)] last:border-0">
                        <td className="py-3 text-sm font-sans text-[var(--color-text-muted)]">
                          {format(new Date(inv.created * 1000), 'd MMM yyyy')}
                        </td>
                        <td className="py-3 text-sm font-sans text-[var(--color-text)]">
                          {inv.lines?.data?.[0]?.description ?? 'Invoice'}
                        </td>
                        <td className="py-3 text-right font-mono text-sm text-[var(--color-text)]" style={{ fontFeatureSettings: "'tnum' 1" }}>
                          ${((inv.amount_due ?? 0) / 100).toFixed(2)}
                        </td>
                        <td className="py-3 text-right">
                          <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold rounded-full ${badgeColor}`}>
                            {displayStatus}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
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
              ownerEmail={ownerEmail}
              ownerAuthId={store.owner_auth_id}
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
