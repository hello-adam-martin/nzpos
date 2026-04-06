import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getDateRange, type DatePreset } from '@/lib/dateRanges'
import { ReportsPageClient } from '@/components/admin/reports/ReportsPageClient'
import { aggregateCOGS, groupByCategory, formatCogsCSV } from '@/lib/cogs'
import type { CogsLineItem, CogsCategoryGroup } from '@/lib/cogs'

export const dynamic = 'force-dynamic'

interface ReportsPageProps {
  searchParams: Promise<{
    preset?: string
    from?: string
    to?: string
    tab?: string
  }>
}

function groupByDate(orders: Array<{ total_cents: number; channel: string; created_at: string; status: string }>) {
  const map = new Map<string, { date: string; totalCents: number; orderCount: number; posCount: number; onlineCount: number }>()

  for (const order of orders) {
    if (order.status === 'refunded') continue
    const date = order.created_at.slice(0, 10) // YYYY-MM-DD
    const existing = map.get(date)
    if (existing) {
      existing.totalCents += order.total_cents
      existing.orderCount += 1
      if (order.channel === 'pos') existing.posCount += 1
      else existing.onlineCount += 1
    } else {
      map.set(date, {
        date,
        totalCents: order.total_cents,
        orderCount: 1,
        posCount: order.channel === 'pos' ? 1 : 0,
        onlineCount: order.channel === 'online' ? 1 : 0,
      })
    }
  }

  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date))
}

function aggregateTopProducts(items: Array<{ product_name: string; line_total_cents: number; quantity: number }>) {
  const map = new Map<string, { product_name: string; totalQuantity: number; totalRevenueCents: number }>()

  for (const item of items) {
    const existing = map.get(item.product_name)
    if (existing) {
      existing.totalQuantity += item.quantity
      existing.totalRevenueCents += item.line_total_cents
    } else {
      map.set(item.product_name, {
        product_name: item.product_name,
        totalQuantity: item.quantity,
        totalRevenueCents: item.line_total_cents,
      })
    }
  }

  return Array.from(map.values())
    .sort((a, b) => b.totalRevenueCents - a.totalRevenueCents)
    .slice(0, 10)
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const supabase = await createSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  const storeId = user?.app_metadata?.store_id as string | undefined
  if (!storeId) {
    redirect('/admin/login')
  }
  const hasInventory = (user?.app_metadata?.inventory as boolean | undefined) === true
  const hasAdvancedReporting = (user?.app_metadata?.advanced_reporting as boolean | undefined) === true

  const params = await searchParams
  const preset = (params.preset ?? 'today') as DatePreset | 'custom'
  const tab = params.tab ?? 'sales'

  let fromDate: Date
  let toDate: Date

  if (preset === 'custom' && params.from && params.to) {
    fromDate = new Date(params.from)
    toDate = new Date(params.to)
    // Ensure toDate is end of day
    toDate.setHours(23, 59, 59, 999)
  } else {
    const range = getDateRange(preset === 'custom' ? 'today' : (preset as DatePreset))
    fromDate = range.from
    toDate = range.to
  }

  const fromISO = fromDate.toISOString()
  const toISO = toDate.toISOString()

  // Query 1: All orders in date range (used for sales, channel breakdown, and GST summary)
  const { data: orders } = await supabase
    .from('orders')
    .select('id, total_cents, gst_cents, channel, created_at, status')
    .eq('store_id', storeId)
    .in('status', ['completed', 'refunded', 'pending_pickup', 'ready', 'collected'])
    .gte('created_at', fromISO)
    .lte('created_at', toISO)

  // Group daily totals (excludes refunded orders)
  const dailyTotals = groupByDate(orders ?? [])

  // Query 2: Top products — two-query approach (Supabase JS v2 cross-table filters broken)
  const { data: storeOrders } = await supabase
    .from('orders')
    .select('id, status')
    .eq('store_id', storeId)
    .in('status', ['completed', 'pending_pickup', 'ready', 'collected'])
    .gte('created_at', fromISO)
    .lte('created_at', toISO)

  const orderIds = (storeOrders ?? []).map(o => o.id)

  let topItemsRaw: Array<{ product_name: string; line_total_cents: number; quantity: number }> = []
  if (orderIds.length > 0) {
    const { data } = await supabase
      .from('order_items')
      .select('product_name, line_total_cents, quantity')
      .in('order_id', orderIds)
    topItemsRaw = data ?? []
  }
  const topProducts = aggregateTopProducts(topItemsRaw)

  // Query 3: Stock levels snapshot — skip when hasInventory is false (D-06)
  let stockLevels: Array<{ name: string; sku: string | null; stock_quantity: number; reorder_threshold: number }> = []
  if (hasInventory) {
    const { data } = await supabase
      .from('products')
      .select('name, sku, stock_quantity, reorder_threshold')
      .eq('store_id', storeId)
      .eq('is_active', true)
      .order('stock_quantity', { ascending: true })
    stockLevels = data ?? []
  }

  // Query 4: COGS data — only when hasAdvancedReporting is true and tab='profit'
  let cogsData: CogsLineItem[] = []
  let cogsCategoryGroups: CogsCategoryGroup[] = []
  let cogsCSVData: Array<Record<string, string | number>> = []

  if (hasAdvancedReporting && tab === 'profit' && orderIds.length > 0) {
    // Fetch order_items with product_id for cost joining
    const { data: cogsItems } = await supabase
      .from('order_items')
      .select('product_id, product_name, quantity, line_total_cents, gst_cents')
      .in('order_id', orderIds)

    // Collect unique product_ids
    const productIds = [...new Set(
      (cogsItems ?? []).map(i => i.product_id).filter(Boolean)
    )] as string[]

    // Fetch product cost data
    // Note: cast to ProductCostData[] because Supabase generated types predate the
    // cost_price_cents column (migration 034_cogs.sql — applied but types not yet regenerated)
    type ProductCostRow = {
      id: string
      cost_price_cents: number | null
      category_id: string | null
      categories: { name: string } | null
    }
    let productCosts: ProductCostRow[] = []
    if (productIds.length > 0) {
      const { data } = await supabase
        .from('products')
        .select('id, cost_price_cents, category_id, categories(name)')
        .in('id', productIds)
      productCosts = (data ?? []) as unknown as ProductCostRow[]
    }

    // Aggregate using pure functions from cogs.ts
    cogsData = aggregateCOGS(cogsItems ?? [], productCosts)
    cogsCategoryGroups = groupByCategory(cogsData)
    cogsCSVData = formatCogsCSV(cogsData)
  }

  // Compute date strings for CSV filename
  const fromDateStr = fromDate.toISOString().slice(0, 10)
  const toDateStr = toDate.toISOString().slice(0, 10)

  // Query 5: GST summary (from orders table — not order_items to avoid double counting)
  const gstOrders = (orders ?? []).filter(o => o.status !== 'refunded')
  const totalSalesCents = gstOrders.reduce((s, o) => s + o.total_cents, 0)
  const totalGSTCents = gstOrders.reduce((s, o) => s + o.gst_cents, 0)
  const gstExclusiveCents = totalSalesCents - totalGSTCents

  const refundedOrders = (orders ?? []).filter(o => o.status === 'refunded')
  const refundedTotalCents = refundedOrders.reduce((s, o) => s + o.total_cents, 0)
  const refundedGSTCents = refundedOrders.reduce((s, o) => s + o.gst_cents, 0)

  // Query 6: GST per-line detail (only when tab='gst')
  let gstLineDetail: Array<{ order_id: string; product_name: string; line_total_cents: number; gst_cents: number }> = []
  if (tab === 'gst' && orderIds.length > 0) {
    const { data } = await supabase
      .from('order_items')
      .select('order_id, product_name, line_total_cents, gst_cents')
      .in('order_id', orderIds)
    gstLineDetail = data ?? []
  }

  // Channel breakdown
  const posTotalCents = (orders ?? [])
    .filter(o => o.channel === 'pos' && o.status !== 'refunded')
    .reduce((s, o) => s + o.total_cents, 0)
  const onlineTotalCents = (orders ?? [])
    .filter(o => o.channel === 'online' && o.status !== 'refunded')
    .reduce((s, o) => s + o.total_cents, 0)

  return (
    <ReportsPageClient
      preset={preset === 'custom' ? 'custom' : preset}
      customFrom={params.from}
      customTo={params.to}
      tab={tab}
      dailyTotals={dailyTotals}
      topProducts={topProducts}
      stockLevels={stockLevels}
      hasInventory={hasInventory}
      totalSalesCents={totalSalesCents}
      totalGSTCents={totalGSTCents}
      gstExclusiveCents={gstExclusiveCents}
      refundedTotalCents={refundedTotalCents}
      refundedGSTCents={refundedGSTCents}
      gstLineDetail={gstLineDetail}
      posTotalCents={posTotalCents}
      onlineTotalCents={onlineTotalCents}
      hasAdvancedReporting={hasAdvancedReporting}
      cogsData={cogsData}
      cogsCategoryGroups={cogsCategoryGroups}
      cogsCSVData={cogsCSVData}
      fromDateStr={fromDateStr}
      toDateStr={toDateStr}
    />
  )
}
