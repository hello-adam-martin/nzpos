import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { formatNZD } from '@/lib/money'
import { DashboardHeroCard } from '@/components/admin/dashboard/DashboardHeroCard'
import { LowStockAlertList } from '@/components/admin/dashboard/LowStockAlertList'
import { getChecklistState } from '@/lib/setupChecklist'
import { SetupChecklist } from '@/components/admin/SetupChecklist'
import { SalesTrendChart } from '@/components/admin/dashboard/SalesTrendChart'
import { ComparisonStatCard } from '@/components/admin/dashboard/ComparisonStatCard'
import { RecentOrdersWidget } from '@/components/admin/dashboard/RecentOrdersWidget'

export const dynamic = 'force-dynamic'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getSalesTrendData(supabase: any, storeId: string, days: number) {
  const start = new Date()
  start.setDate(start.getDate() - days)
  start.setHours(0, 0, 0, 0)
  const { data } = await supabase
    .from('orders')
    .select('created_at, total_cents')
    .eq('store_id', storeId)
    .in('status', ['completed', 'pending_pickup', 'ready', 'collected'])
    .gte('created_at', start.toISOString())
    .order('created_at', { ascending: true })
  const grouped: Record<string, number> = {}
  for (const order of data ?? []) {
    const date = order.created_at.slice(0, 10)
    grouped[date] = (grouped[date] ?? 0) + order.total_cents
  }
  const result = []
  for (let i = 0; i < days; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    const key = d.toISOString().slice(0, 10)
    result.push({ date: key.slice(5), totalCents: grouped[key] ?? 0 })
  }
  return result
}

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  const storeId = user?.app_metadata?.store_id as string | undefined
  if (!storeId) {
    redirect('/admin/login')
  }

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const { data: todayOrders } = await supabase
    .from('orders')
    .select('total_cents, channel')
    .eq('store_id', storeId)
    .in('status', ['completed', 'pending_pickup', 'ready', 'collected'])
    .gte('created_at', todayStart.toISOString())

  const orders = todayOrders ?? []
  const totalSalesCents = orders.reduce((sum, o) => sum + o.total_cents, 0)
  const orderCount = orders.length
  const posCount = orders.filter(o => o.channel === 'pos').length
  const onlineCount = orders.filter(o => o.channel === 'online').length

  // Yesterday's orders (for DASH-02 comparison)
  const yesterdayStart = new Date(todayStart)
  yesterdayStart.setDate(yesterdayStart.getDate() - 1)
  const { data: yesterdayOrders } = await supabase
    .from('orders')
    .select('total_cents')
    .eq('store_id', storeId)
    .in('status', ['completed', 'pending_pickup', 'ready', 'collected'])
    .gte('created_at', yesterdayStart.toISOString())
    .lt('created_at', todayStart.toISOString())
  const yesterdayCents = (yesterdayOrders ?? []).reduce((sum, o) => sum + o.total_cents, 0)

  // This week / last week (for DASH-02 comparison)
  const dayOfWeek = todayStart.getDay() === 0 ? 6 : todayStart.getDay() - 1
  const thisWeekStart = new Date(todayStart)
  thisWeekStart.setDate(todayStart.getDate() - dayOfWeek)
  const lastWeekStart = new Date(thisWeekStart)
  lastWeekStart.setDate(thisWeekStart.getDate() - 7)
  const lastWeekEnd = new Date(thisWeekStart)

  const { data: thisWeekOrders } = await supabase
    .from('orders')
    .select('total_cents')
    .eq('store_id', storeId)
    .in('status', ['completed', 'pending_pickup', 'ready', 'collected'])
    .gte('created_at', thisWeekStart.toISOString())
  const thisWeekCents = (thisWeekOrders ?? []).reduce((sum, o) => sum + o.total_cents, 0)

  const { data: lastWeekOrders } = await supabase
    .from('orders')
    .select('total_cents')
    .eq('store_id', storeId)
    .in('status', ['completed', 'pending_pickup', 'ready', 'collected'])
    .gte('created_at', lastWeekStart.toISOString())
    .lt('created_at', lastWeekEnd.toISOString())
  const lastWeekCents = (lastWeekOrders ?? []).reduce((sum, o) => sum + o.total_cents, 0)

  // Sales trend data (for DASH-01, both periods)
  const trendData7 = await getSalesTrendData(supabase, storeId, 7)
  const trendData30 = await getSalesTrendData(supabase, storeId, 30)

  // Recent orders (for DASH-03)
  const { data: recentOrders } = await supabase
    .from('orders')
    .select('id, created_at, total_cents, status')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })
    .limit(5)

  const { data: products } = await supabase
    .from('products')
    .select('name, stock_quantity, reorder_threshold')
    .eq('store_id', storeId)
    .eq('is_active', true)

  const lowStockProducts = (products ?? []).filter(
    p => p.stock_quantity <= p.reorder_threshold
  )

  // Checklist data
  const { data: storeData } = await supabase
    .from('stores')
    .select('name, slug, logo_url, setup_wizard_dismissed')
    .eq('id', storeId)
    .single()

  const { data: channelOrders } = await supabase
    .from('orders')
    .select('channel')
    .eq('store_id', storeId)
    .in('status', ['completed', 'pending_pickup', 'ready', 'collected'])
    .limit(100)

  const orderChannels = [...new Set((channelOrders ?? []).map(o => o.channel))]
  const productCount = (products ?? []).length
  const checklistState = getChecklistState(
    storeData ?? { name: null, slug: '', logo_url: null, setup_wizard_dismissed: false },
    productCount,
    orderChannels
  )

  return (
    <div className="space-y-[var(--space-xl)]">
      <SetupChecklist state={checklistState} />
      <h1 className="font-display font-bold text-2xl text-[var(--color-text)]">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-[var(--space-lg)]">
        <DashboardHeroCard
          label="Today's Sales"
          value={formatNZD(totalSalesCents)}
        />
        <DashboardHeroCard
          label="Orders Today"
          value={orderCount.toString()}
        />
        <DashboardHeroCard
          label="POS vs Online"
          value={(posCount + onlineCount).toString()}
          subLabel={`POS: ${posCount} / Online: ${onlineCount}`}
        />
      </div>

      {/* Comparison stat cards — per DASH-02 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-[var(--space-lg)]">
        <ComparisonStatCard
          label="Today's Sales"
          subLabel="vs. yesterday"
          valueCents={totalSalesCents}
          previousCents={yesterdayCents}
        />
        <ComparisonStatCard
          label="This Week"
          subLabel="vs. last week"
          valueCents={thisWeekCents}
          previousCents={lastWeekCents}
        />
      </div>

      {/* Sales trend chart — per DASH-01 */}
      <SalesTrendChart data7={trendData7} data30={trendData30} />

      {/* Recent orders — per DASH-03 */}
      <RecentOrdersWidget orders={recentOrders ?? []} />

      <LowStockAlertList products={lowStockProducts} />
    </div>
  )
}
