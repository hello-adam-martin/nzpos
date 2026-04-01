import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { formatNZD } from '@/lib/money'
import { DashboardHeroCard } from '@/components/admin/dashboard/DashboardHeroCard'
import { LowStockAlertList } from '@/components/admin/dashboard/LowStockAlertList'

export const dynamic = 'force-dynamic'

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

  const { data: products } = await supabase
    .from('products')
    .select('name, stock_quantity, reorder_threshold')
    .eq('store_id', storeId)
    .eq('is_active', true)

  const lowStockProducts = (products ?? []).filter(
    p => p.stock_quantity <= p.reorder_threshold
  )

  return (
    <div className="space-y-[var(--space-xl)]">
      <h1 className="font-sans font-bold text-xl text-[var(--color-text)]">Dashboard</h1>

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

      <LowStockAlertList products={lowStockProducts} />
    </div>
  )
}
