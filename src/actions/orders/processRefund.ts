// @deprecated — Use processPartialRefund instead. This action only supports full refunds.
'use server'
import 'server-only'
import { revalidatePath } from 'next/cache'
import { RefundSchema } from '@/schemas/refund'
import { stripe } from '@/lib/stripe'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const REFUNDABLE_STATUSES = new Set([
  'completed',
  'pending_pickup',
  'ready',
  'collected',
])

export async function processRefund(input: unknown): Promise<
  | { success: true }
  | { error: string }
> {
  // 1. Verify owner auth (owner session via Supabase Auth, not staff JWT)
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  const storeId = user.app_metadata?.store_id as string | undefined
  if (!storeId) return { error: 'No store context' }

  // 2. Validate input with Zod
  const parsed = RefundSchema.safeParse(input)
  if (!parsed.success) return { error: 'Invalid input' }
  const { orderId, reason, restoreStock } = parsed.data

  // 3. Fetch order with items via admin client (bypasses RLS)
  const adminClient = createSupabaseAdminClient()
  const { data: order } = await adminClient
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', orderId)
    .eq('store_id', storeId)
    .single()

  // 4. Validate refundable state
  if (!order) return { error: 'Order not found' }
  if (order.status === 'refunded') return { error: 'Order already refunded' }
  if (!REFUNDABLE_STATUSES.has(order.status)) {
    return { error: 'Order cannot be refunded in current status' }
  }

  // 5. Optimistic lock: claim refund status BEFORE calling Stripe (prevents double-refund race)
  const { data: locked } = await adminClient
    .from('orders')
    .update({ status: 'refunded', notes: reason })
    .eq('id', orderId)
    .in('status', Array.from(REFUNDABLE_STATUSES) as ('completed' | 'pending_pickup' | 'ready' | 'collected')[])
    .select('id')
    .single()

  if (!locked) {
    return { error: 'Order already refunded or status changed. Refresh and try again.' }
  }

  // 6. Stripe refund for online orders (per D-15, Pitfall #6)
  if (order.channel === 'online' && order.stripe_payment_intent_id) {
    try {
      const refund = await stripe.refunds.create({
        payment_intent: order.stripe_payment_intent_id,
        amount: order.total_cents,
      })
      if (refund.status !== 'succeeded' && refund.status !== 'pending') {
        // Revert status on Stripe failure
        await adminClient.from('orders').update({ status: order.status, notes: null }).eq('id', orderId)
        return { error: 'Stripe refund failed. Check your Stripe dashboard and try again.' }
      }
      // Store refund ID for audit trail
      await (adminClient as any).from('orders').update({ stripe_refund_id: refund.id }).eq('id', orderId)
    } catch {
      // Revert status on Stripe failure
      await adminClient.from('orders').update({ status: order.status, notes: null }).eq('id', orderId)
      return { error: 'Stripe refund failed. Check your Stripe dashboard and try again.' }
    }
  } else if (order.channel === 'online' && !order.stripe_payment_intent_id) {
    // Revert status
    await adminClient.from('orders').update({ status: order.status, notes: null }).eq('id', orderId)
    return { error: 'Cannot refund — Stripe payment ID not found. Check order in Stripe dashboard.' }
  }

  // 7. Restore stock if requested (atomic increment via RPC)
  if (restoreStock && order.order_items) {
    for (const item of order.order_items) {
      await adminClient.rpc('restore_stock', {
        p_product_id: item.product_id,
        p_quantity: item.quantity,
      })
    }
  }

  // 8. Revalidate paths to refresh cached data
  revalidatePath('/admin/orders')
  revalidatePath('/admin/reports')
  revalidatePath('/admin/dashboard')

  return { success: true }
}
