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

  // 5. Stripe refund for online orders (per D-15, Pitfall #6)
  if (order.channel === 'online' && order.stripe_payment_intent_id) {
    try {
      const refund = await stripe.refunds.create({
        payment_intent: order.stripe_payment_intent_id,
      })
      if (refund.status !== 'succeeded' && refund.status !== 'pending') {
        return { error: 'Stripe refund failed. Check your Stripe dashboard and try again.' }
      }
    } catch {
      return { error: 'Stripe refund failed. Check your Stripe dashboard and try again.' }
    }
  } else if (order.channel === 'online' && !order.stripe_payment_intent_id) {
    return { error: 'Cannot refund — Stripe payment ID not found. Check order in Stripe dashboard.' }
  }

  // 6. Update order status to refunded, store reason in notes
  await adminClient
    .from('orders')
    .update({ status: 'refunded', notes: reason })
    .eq('id', orderId)

  // 7. Restore stock if requested (read-then-write pattern, safe for v1 single-operator)
  if (restoreStock && order.order_items) {
    for (const item of order.order_items) {
      const { data: product } = await adminClient
        .from('products')
        .select('stock_quantity')
        .eq('id', item.product_id)
        .single()
      if (product) {
        await adminClient
          .from('products')
          .update({ stock_quantity: product.stock_quantity + item.quantity })
          .eq('id', item.product_id)
      }
    }
  }

  // 8. Revalidate paths to refresh cached data
  revalidatePath('/admin/orders')
  revalidatePath('/admin/reports')
  revalidatePath('/admin/dashboard')

  return { success: true }
}
