import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { DashboardHeroCard } from '@/components/admin/dashboard/DashboardHeroCard'
import SignupTrendChart from '@/components/super-admin/SignupTrendChart'

export const dynamic = 'force-dynamic'

function buildSignupTrend(stores: { created_at: string }[], days: number) {
  const now = new Date()
  const start = new Date(now)
  start.setDate(now.getDate() - days)
  start.setHours(0, 0, 0, 0)
  const grouped: Record<string, number> = {}
  for (const store of stores) {
    const date = store.created_at.slice(0, 10)
    grouped[date] = (grouped[date] ?? 0) + 1
  }
  const result: { date: string; count: number }[] = []
  for (let i = 0; i < days; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const key = d.toISOString().slice(0, 10)
    const label = d.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' })
    result.push({ date: label, count: grouped[key] ?? 0 })
  }
  return result
}

export default async function SuperAdminDashboardPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createSupabaseAdminClient() as any

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const thirtyDaysAgo = new Date(now)
  thirtyDaysAgo.setDate(now.getDate() - 30)
  thirtyDaysAgo.setHours(0, 0, 0, 0)

  const [
    { count: activeCount },
    { count: suspendedCount },
    { count: newSignupsCount },
    { data: addonData },
    { data: trendStores },
  ] = await Promise.all([
    admin.from('stores').select('id', { count: 'exact', head: true }).eq('is_active', true),
    admin.from('stores').select('id', { count: 'exact', head: true }).eq('is_active', false),
    admin
      .from('stores')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', startOfMonth.toISOString()),
    admin
      .from('store_plans')
      .select('has_xero, has_email_notifications, has_custom_domain, has_inventory'),
    admin
      .from('stores')
      .select('created_at')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: true }),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const plans: any[] = addonData ?? []
  const totalPlans = plans.length || 1 // avoid division by zero
  const adoptionRates = {
    xero: Math.round((plans.filter((p) => p.has_xero).length / totalPlans) * 100),
    email_notifications: Math.round(
      (plans.filter((p) => p.has_email_notifications).length / totalPlans) * 100
    ),
    custom_domain: Math.round(
      (plans.filter((p) => p.has_custom_domain).length / totalPlans) * 100
    ),
    inventory: Math.round(
      (plans.filter((p) => p.has_inventory).length / totalPlans) * 100
    ),
  }

  const trendData = buildSignupTrend(trendStores ?? [], 30)

  return (
    <div>
      <h1 className="font-display text-xl font-semibold text-[var(--color-text)] mb-6">
        Platform Overview
      </h1>

      {/* Tenant stat cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 mb-6">
        <DashboardHeroCard label="Active Tenants" value={String(activeCount ?? 0)} />
        <DashboardHeroCard label="Suspended Tenants" value={String(suspendedCount ?? 0)} />
        <DashboardHeroCard label="New This Month" value={String(newSignupsCount ?? 0)} />
      </div>

      {/* Add-on adoption cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 mb-6">
        <DashboardHeroCard
          label="Xero Adoption"
          value={adoptionRates.xero + '%'}
          subLabel={adoptionRates.xero + '% of tenants'}
        />
        <DashboardHeroCard
          label="Email Adoption"
          value={adoptionRates.email_notifications + '%'}
          subLabel={adoptionRates.email_notifications + '% of tenants'}
        />
        <DashboardHeroCard
          label="Domain Adoption"
          value={adoptionRates.custom_domain + '%'}
          subLabel={adoptionRates.custom_domain + '% of tenants'}
        />
        <DashboardHeroCard
          label="Inventory Adoption"
          value={adoptionRates.inventory + '%'}
          subLabel={adoptionRates.inventory + '% of tenants'}
        />
      </div>

      {/* 30-day signup trend chart */}
      <SignupTrendChart data={trendData} />
    </div>
  )
}
