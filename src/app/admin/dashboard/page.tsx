import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { formatNZD } from '@/lib/money'
import { DashboardHeroCard } from '@/components/admin/dashboard/DashboardHeroCard'
import { LowStockAlertList } from '@/components/admin/dashboard/LowStockAlertList'
import { getChecklistState } from '@/lib/setupChecklist'
import { SetupChecklist } from '@/components/admin/SetupChecklist'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  const storeId = user?.app_metadata?.store_id as string | undefined
  if (!storeId) {
    redirect('/admin/login')
  }
  const hasInventory = (user?.app_metadata?.inventory as boolean | undefined) === true

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

  const { data: products } = await supabase
    .from('products')
    .select('name, stock_quantity, reorder_threshold')
    .eq('store_id', storeId)
    .eq('is_active', true)

  // Only compute low stock when inventory add-on is active (D-06)
  const lowStockProducts = hasInventory
    ? (products ?? []).filter(p => p.stock_quantity <= p.reorder_threshold)
    : []

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

      {hasInventory && <LowStockAlertList products={lowStockProducts} />}
    </div>
  )
}
