import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import AnalyticsContent from '@/components/super-admin/AnalyticsContent'
import { format, subMonths } from 'date-fns'

export const dynamic = 'force-dynamic'

const ADDON_DISPLAY_NAMES: Record<string, string> = {
  xero: 'Xero',
  inventory: 'Inventory',
  email_notifications: 'Email Notifications',
  custom_domain: 'Custom Domain',
}

export default async function AnalyticsPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createSupabaseAdminClient() as any

  const now = new Date()
  const currentMonth = format(now, 'yyyy-MM')

  // Build month keys for last 6 months
  const monthKeys = Array.from({ length: 6 }, (_, i) => ({
    key: format(subMonths(now, 5 - i), 'yyyy-MM'),
    label: format(subMonths(now, 5 - i), 'MMM yyyy'),
  }))

  // Run all queries in parallel
  const [
    mrrResult,
    churnResult,
    activeResult,
    addonResult,
    metaResult,
    ...trendResults
  ] = await Promise.all([
    // 1. Current MRR — sum mrr_cents for active/past_due in current month
    admin
      .from('platform_analytics_snapshots')
      .select('mrr_cents')
      .in('status', ['active', 'past_due'])
      .eq('snapshot_month', currentMonth),

    // 2. Churn count — canceled this month
    admin
      .from('platform_analytics_snapshots')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'canceled')
      .gte('canceled_at', format(new Date(now.getFullYear(), now.getMonth(), 1), "yyyy-MM-dd'T'HH:mm:ssxxx")),

    // 3. Active subscriptions count — active/past_due/trialing in current month
    admin
      .from('platform_analytics_snapshots')
      .select('id', { count: 'exact', head: true })
      .in('status', ['active', 'past_due', 'trialing'])
      .eq('snapshot_month', currentMonth),

    // 4. Add-on revenue — active/past_due with addon_type in current month
    admin
      .from('platform_analytics_snapshots')
      .select('addon_type, mrr_cents')
      .in('status', ['active', 'past_due'])
      .not('addon_type', 'is', null)
      .eq('snapshot_month', currentMonth),

    // 5. Last synced metadata
    admin
      .from('analytics_sync_metadata')
      .select('last_synced_at')
      .eq('id', 1)
      .single(),

    // 6. MRR trend — one query per month (6 queries)
    ...monthKeys.map(({ key }) =>
      admin
        .from('platform_analytics_snapshots')
        .select('mrr_cents')
        .in('status', ['active', 'past_due'])
        .eq('snapshot_month', key)
    ),
  ])

  // Compute current MRR
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mrrRows: any[] = mrrResult.data ?? []
  const totalMrrCents = mrrRows.reduce((sum: number, row: { mrr_cents: number }) => sum + (row.mrr_cents ?? 0), 0)
  const formattedMrr = (totalMrrCents / 100).toLocaleString('en-NZ', {
    style: 'currency',
    currency: 'NZD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })

  // Churn count
  const churnCount: number = churnResult.count ?? 0

  // Active subscriptions count
  const activeCount: number = activeResult.count ?? 0

  // MRR trend data
  const mrrTrendData = monthKeys.map(({ label }, i) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows: any[] = trendResults[i]?.data ?? []
    const total = rows.reduce((sum: number, row: { mrr_cents: number }) => sum + (row.mrr_cents ?? 0), 0)
    return { month: label, mrr: Math.round(total / 100) }
  })

  // Add-on revenue breakdown — group by addon_type in JS
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const addonRows: any[] = addonResult.data ?? []
  const addonMap: Record<string, number> = {}
  for (const row of addonRows) {
    if (row.addon_type) {
      addonMap[row.addon_type] = (addonMap[row.addon_type] ?? 0) + (row.mrr_cents ?? 0)
    }
  }
  const addonRevenueData = Object.entries(addonMap)
    .filter(([, cents]) => cents > 0)
    .map(([addonType, cents]) => ({
      name: ADDON_DISPLAY_NAMES[addonType] ?? addonType,
      mrr: Math.round(cents / 100),
    }))
    .sort((a, b) => b.mrr - a.mrr)

  // Last synced timestamp
  const lastSyncedAt: string | null = metaResult.data?.last_synced_at ?? null

  return (
    <AnalyticsContent
      formattedMrr={formattedMrr}
      churnCount={churnCount}
      activeCount={activeCount}
      mrrTrendData={mrrTrendData}
      addonRevenueData={addonRevenueData}
      lastSyncedAt={lastSyncedAt}
    />
  )
}
