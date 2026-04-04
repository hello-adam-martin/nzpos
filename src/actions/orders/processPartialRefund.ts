'use server'
import 'server-only'
import { revalidatePath } from 'next/cache'
import { PartialRefundSchema } from '@/schemas/refund'
import { stripe } from '@/lib/stripe'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { buildCreditNote } from '@/lib/xero/buildInvoice'
import { getAuthenticatedXeroClient } from '@/lib/xero/client'
import { resolveStaffAuthVerified } from '@/lib/resolveAuth'
import { POS_ROLES } from '@/config/roles'

const REFUNDABLE_STATUSES = new Set([
  'completed',
  'partially_refunded',
  'pending_pickup',
  'ready',
  'collected',
])

/**
 * Calculates the refund amount for a single line item.
 * Uses Math.floor to avoid over-refunding due to rounding.
 * Example: qty=3, line_total=1000, refund qty=1 => Math.floor(1/3 * 1000) = 333
 */
function calculateItemRefundCents(
  item: { line_total_cents: number; quantity: number },
  quantityToRefund: number
): number {
  return Math.floor((quantityToRefund / item.quantity) * item.line_total_cents)
}

export async function processPartialRefund(
  input: unknown
): Promise<{ success: true; refundId: string } | { error: string }> {
  // 1. Auth: owner (Supabase Auth) or manager (staff JWT) — per STAFF-06
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  let storeId: string | undefined

  if (user?.app_metadata?.store_id) {
    storeId = user.app_metadata.store_id as string
  } else {
    // Manager path — DB-verified role check
    const staffAuth = await resolveStaffAuthVerified()
    if (staffAuth && (staffAuth.role === POS_ROLES.OWNER || staffAuth.role === POS_ROLES.MANAGER)) {
      storeId = staffAuth.store_id
    }
  }

  if (!storeId) return { error: 'Not authenticated' }

  // 2. Validate input with Zod
  const parsed = PartialRefundSchema.safeParse(input)
  if (!parsed.success) return { error: 'Invalid input' }
  const { orderId, reason, items } = parsed.data

  // 3. Fetch order with all order_items via admin client (bypasses RLS)
  const adminClient = createSupabaseAdminClient()
  const { data: order } = await adminClient
    .from('orders')
    .select('*, order_items(*, products(product_type))')
    .eq('id', orderId)
    .eq('store_id', storeId)
    .single()

  if (!order) return { error: 'Order not found' }

  // 4. Validate refundable status
  if (!REFUNDABLE_STATUSES.has(order.status) || order.status === 'refunded') {
    return { error: 'Order cannot be refunded in current status' }
  }

  // 5. Fetch existing refund_items for this order to compute already-refunded quantities
  const { data: existingRefunds } = await adminClient
    .from('refunds')
    .select('id')
    .eq('order_id', orderId)

  const existingRefundIds = (existingRefunds ?? []).map((r: { id: string }) => r.id)

  let existingRefundItems: Array<{ order_item_id: string; quantity_refunded: number }> = []
  if (existingRefundIds.length > 0) {
    const { data: refundItemsData } = await adminClient
      .from('refund_items')
      .select('order_item_id, quantity_refunded')
      .in('refund_id', existingRefundIds)
    existingRefundItems = refundItemsData ?? []
  } else {
    // Still need to consume one from() call (handled by calling with empty result)
    const { data: refundItemsData } = await adminClient
      .from('refund_items')
      .select('order_item_id, quantity_refunded')
      .in('refund_id', [])
    existingRefundItems = refundItemsData ?? []
  }

  // 6. Build a Map of order_item_id -> totalAlreadyRefunded
  const alreadyRefundedMap = new Map<string, number>()
  for (const ri of existingRefundItems) {
    const existing = alreadyRefundedMap.get(ri.order_item_id) ?? 0
    alreadyRefundedMap.set(ri.order_item_id, existing + ri.quantity_refunded)
  }

  // 7. Validate each selected item against available quantities
  const orderItemsMap = new Map(
    (order.order_items ?? []).map((oi: any) => [oi.id, oi])
  )

  for (const selectedItem of items) {
    const orderItem = orderItemsMap.get(selectedItem.orderItemId) as any
    if (!orderItem) {
      return { error: `Order item not found: ${selectedItem.orderItemId}` }
    }
    const alreadyRefunded = alreadyRefundedMap.get(selectedItem.orderItemId) ?? 0
    const remaining = orderItem.quantity - alreadyRefunded
    if (selectedItem.quantityToRefund > remaining) {
      return {
        error: `Cannot refund more than remaining quantity for item: ${orderItem.product_name}`,
      }
    }
  }

  // 8. Calculate per-item refund cents and total
  let totalRefundCents = 0
  const itemRefundAmounts: Array<{
    orderItemId: string
    quantityToRefund: number
    lineTotalRefundedCents: number
    productId: string
  }> = []

  for (const selectedItem of items) {
    const orderItem = orderItemsMap.get(selectedItem.orderItemId) as any
    const lineCents = calculateItemRefundCents(orderItem, selectedItem.quantityToRefund)
    totalRefundCents += lineCents
    itemRefundAmounts.push({
      orderItemId: selectedItem.orderItemId,
      quantityToRefund: selectedItem.quantityToRefund,
      lineTotalRefundedCents: lineCents,
      productId: orderItem.product_id,
    })
  }

  // 9. Insert refund record (idempotency anchor — pending state)
  const { data: refundRecord } = await adminClient
    .from('refunds')
    .insert({
      order_id: orderId,
      store_id: storeId,
      reason,
      total_cents: totalRefundCents,
      created_by: user?.id ?? null,
      customer_notified: false,
    })
    .select('id')
    .single()

  const refundId = (refundRecord as any)?.id as string

  // 10. Stripe refund for online orders
  if (order.channel === 'online' && order.stripe_payment_intent_id) {
    try {
      const stripeRefund = await stripe.refunds.create({
        payment_intent: order.stripe_payment_intent_id,
        amount: totalRefundCents,
      })

      // 11. Update refund record with stripe_refund_id
      await adminClient
        .from('refunds')
        .update({ stripe_refund_id: stripeRefund.id })
        .eq('id', refundId)
    } catch {
      // Delete pending refund record to maintain consistency
      await adminClient.from('refunds').delete().eq('id', refundId)
      return { error: 'Stripe refund failed. Check your Stripe dashboard and try again.' }
    }
  }

  // Build product_type lookup from fetched order items
  const productTypeMap = new Map<string, string>()
  for (const oi of (order.order_items ?? [])) {
    productTypeMap.set(oi.product_id, (oi as any).products?.product_type ?? 'physical')
  }

  // 12. Restore stock per selected item (atomic RPC)
  for (const item of itemRefundAmounts) {
    // PROD-03: service products skip stock restore
    if (productTypeMap.get(item.productId) === 'service') continue
    await adminClient.rpc('restore_stock', {
      p_product_id: item.productId,
      p_quantity: item.quantityToRefund,
    })
  }

  // 13. Insert refund_items records
  await adminClient.from('refund_items').insert(
    itemRefundAmounts.map((item) => ({
      refund_id: refundId,
      order_item_id: item.orderItemId,
      quantity_refunded: item.quantityToRefund,
      line_total_refunded_cents: item.lineTotalRefundedCents,
    }))
  )

  // 14. Determine new order status
  // Re-query all refund_items for this order to count total refunded per item
  const { data: allRefundRecords } = await adminClient
    .from('refunds')
    .select('id')
    .eq('order_id', orderId)

  const allRefundIds = (allRefundRecords ?? []).map((r: any) => r.id)

  const { data: allRefundItems } = await adminClient
    .from('refund_items')
    .select('order_item_id, quantity_refunded')
    .in('refund_id', allRefundIds)

  // Aggregate total refunded per order_item
  const totalRefundedPerItem = new Map<string, number>()
  for (const ri of allRefundItems ?? []) {
    const existing = totalRefundedPerItem.get(ri.order_item_id) ?? 0
    totalRefundedPerItem.set(ri.order_item_id, existing + ri.quantity_refunded)
  }

  // Check if every order item is fully refunded
  const allItemsFullyRefunded = (order.order_items ?? []).every((oi: any) => {
    const totalRefunded = totalRefundedPerItem.get(oi.id) ?? 0
    return totalRefunded >= oi.quantity
  })

  const newStatus = allItemsFullyRefunded ? 'refunded' : 'partially_refunded'

  // 15. Update order status
  await adminClient
    .from('orders')
    .update({ status: newStatus })
    .eq('id', orderId)

  // 16. Attempt Xero credit note (D-09 graceful failure)
  try {
    const orderDate = new Date(order.created_at).toISOString().split('T')[0]

    // Query xero_sync_log for the order's date with a successful sync
    const { data: syncLog } = await (adminClient as any)
      .from('xero_sync_log')
      .select('xero_invoice_id, xero_invoice_number')
      .eq('store_id', storeId)
      .eq('sync_date', orderDate)
      .eq('status', 'success')
      .single()

    if (syncLog?.xero_invoice_number) {
      // Get Xero settings
      const { data: xeroConn } = await (adminClient as any)
        .from('xero_connections')
        .select('account_code_cash, account_code_eftpos, account_code_online, xero_contact_id')
        .eq('store_id', storeId)
        .eq('status', 'connected')
        .single()

      if (xeroConn?.xero_contact_id) {
        const xeroSettings = {
          cashAccountCode: xeroConn.account_code_cash,
          eftposAccountCode: xeroConn.account_code_eftpos,
          onlineAccountCode: xeroConn.account_code_online,
          contactId: xeroConn.xero_contact_id,
        }

        const xeroClient = await getAuthenticatedXeroClient(storeId)
        if (xeroClient) {
          const creditNote = buildCreditNote(
            totalRefundCents,
            orderDate,
            xeroSettings,
            syncLog.xero_invoice_number
          )
          await xeroClient.xero.accountingApi.createCreditNotes(xeroClient.tenantId, {
            creditNotes: [creditNote],
          })
        }
      }
    }
  } catch (err) {
    // Xero failure is non-blocking — log warning but do not fail the refund
    console.warn('[processPartialRefund] Xero credit note failed (non-blocking):', err)
  }

  // 17. Revalidate cached pages
  revalidatePath('/admin/orders')
  revalidatePath('/admin/reports')
  revalidatePath('/admin/dashboard')

  // 18. Return success
  return { success: true, refundId }
}
