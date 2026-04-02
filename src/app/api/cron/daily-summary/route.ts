import 'server-only'
import { NextRequest } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'
import { DailySummaryEmail } from '@/emails/DailySummaryEmail'
import { toZonedTime, fromZonedTime } from 'date-fns-tz'
import { startOfDay, endOfDay, subDays, format } from 'date-fns'

export const dynamic = 'force-dynamic'

const NZ_TZ = 'Pacific/Auckland'

export async function GET(req: NextRequest) {
  // Auth: CRON_SECRET Bearer token (matches expire-orders pattern)
  const authHeader = req.headers.get('Authorization')
  if (authHeader !== 'Bearer ' + process.env.CRON_SECRET) {
    return new Response('Unauthorized', { status: 401 })
  }

  const founderEmail = process.env.FOUNDER_EMAIL
  if (!founderEmail) {
    console.error('[daily-summary] FOUNDER_EMAIL not configured')
    return new Response(JSON.stringify({ error: 'FOUNDER_EMAIL not set' }), { status: 500 })
  }

  const supabase = createSupabaseAdminClient()

  // Compute yesterday in NZ time (UTC 19:00 = NZ 7 AM next day)
  const nowNZ = toZonedTime(new Date(), NZ_TZ)
  const yesterdayNZ = subDays(nowNZ, 1)
  const yesterdayStart = fromZonedTime(startOfDay(yesterdayNZ), NZ_TZ).toISOString()
  const yesterdayEnd = fromZonedTime(endOfDay(yesterdayNZ), NZ_TZ).toISOString()
  const dateLabel = format(yesterdayNZ, 'd MMMM yyyy')

  // Get store info (single-store v1 — fetch first store, including address/phone added in 010)
  const { data: store } = await supabase
    .from('stores')
    .select('id, name, address, phone')
    .limit(1)
    .single()

  if (!store) {
    console.error('[daily-summary] No store found')
    return new Response(JSON.stringify({ error: 'No store' }), { status: 500 })
  }

  // Query 1: Orders completed yesterday — aggregate by payment_method
  const { data: orders } = await supabase
    .from('orders')
    .select('id, total_cents, payment_method')
    .eq('store_id', store.id)
    .in('status', ['completed', 'pending_pickup', 'ready', 'collected'])
    .gte('created_at', yesterdayStart)
    .lt('created_at', yesterdayEnd)

  const totalSales = orders?.length ?? 0
  const totalRevenueCents = (orders ?? []).reduce((sum, o) => sum + (o.total_cents ?? 0), 0)
  // NZ GST is 15% tax-inclusive: GST portion = total × 3/23
  const totalGstCents = Math.round(totalRevenueCents * 3 / 23)

  // Revenue by payment method (per D-11: EFTPOS, Cash, Online)
  const methodMap: Record<string, number> = {}
  for (const o of orders ?? []) {
    const method = o.payment_method ?? 'unknown'
    // Normalize: map 'stripe' or 'card' to 'Online', keep 'eftpos' and 'cash' display-formatted
    const displayMethod =
      ['stripe', 'card', 'online'].includes(method) ? 'Online' :
      method === 'eftpos' ? 'EFTPOS' :
      method === 'cash' ? 'Cash' : method
    methodMap[displayMethod] = (methodMap[displayMethod] ?? 0) + (o.total_cents ?? 0)
  }
  const revenueByMethod = Object.entries(methodMap).map(([method, amountCents]) => ({
    method,
    amountCents,
  }))

  // Query 2: Top 5 products by quantity sold yesterday (per D-12)
  const { data: topProductRows } = await supabase
    .from('order_items')
    .select('product_id, quantity, line_total_cents, products(name), orders!inner(store_id, status, created_at)')
    .eq('orders.store_id', store.id)
    .in('orders.status', ['completed', 'pending_pickup', 'ready', 'collected'])
    .gte('orders.created_at', yesterdayStart)
    .lt('orders.created_at', yesterdayEnd)

  // Aggregate by product
  const productAgg: Record<string, { name: string; quantity: number; revenueCents: number }> = {}
  for (const row of topProductRows ?? []) {
    const pid = row.product_id
    if (!productAgg[pid]) {
      productAgg[pid] = {
        name: (row.products as { name: string } | null)?.name ?? 'Unknown',
        quantity: 0,
        revenueCents: 0,
      }
    }
    productAgg[pid].quantity += row.quantity
    productAgg[pid].revenueCents += row.line_total_cents
  }
  const topProducts = Object.values(productAgg)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5)
    .map((p, i) => ({ rank: i + 1, ...p }))

  // Query 3: Low stock items (below or at reorder_threshold) — per D-09, included in daily summary
  // NOTE: Supabase JS SDK does not support column-to-column filters natively.
  // Fetch all products with a non-null reorder_threshold and filter in JS.
  // For a single store with <1000 products this is fine.
  const { data: lowStockRows } = await supabase
    .from('products')
    .select('name, stock_quantity, reorder_threshold')
    .eq('store_id', store.id)
    .eq('is_active', true)
    .not('reorder_threshold', 'is', null)

  const lowStockItems = (lowStockRows ?? [])
    .filter(p => p.reorder_threshold !== null && p.stock_quantity <= p.reorder_threshold)
    .map(p => ({
      name: p.name,
      currentStock: p.stock_quantity,
      reorderThreshold: p.reorder_threshold!,
    }))

  // Send daily summary email (cron CAN await — no user to block, per D-05)
  const result = await sendEmail({
    to: founderEmail,
    subject: `Daily summary — ${dateLabel}`,
    react: DailySummaryEmail({
      storeName: store.name,
      storeAddress: (store as { address?: string | null }).address ?? '',
      storePhone: (store as { phone?: string | null }).phone ?? '',
      date: dateLabel,
      totalSales,
      totalRevenueCents,
      totalGstCents,
      revenueByMethod,
      topProducts,
      lowStockItems,
    }),
  })

  console.log(`[daily-summary] Sent for ${dateLabel}: ${totalSales} sales, ${lowStockItems.length} low stock items`)
  return new Response(JSON.stringify({
    sent: result.success,
    date: dateLabel,
    totalSales,
    lowStockCount: lowStockItems.length,
  }), { status: 200 })
}
