'use server'
import 'server-only'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveStaffAuth } from '@/lib/resolveAuth'
import { sendEmail } from '@/lib/email'
import { PickupReadyEmail } from '@/emails/PickupReadyEmail'

// Allowed status transitions per D-22
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  completed: ['pending_pickup'],
  pending_pickup: ['ready'],
  ready: ['collected'],
}

const UpdateStatusSchema = z.object({
  orderId: z.string().uuid(),
  newStatus: z.enum(['pending_pickup', 'ready', 'collected']),
})

export async function updateOrderStatus(input: unknown): Promise<
  | { success: true; newStatus: string }
  | { error: string }
> {
  // 1. Auth check: verify staff JWT from staff_session cookie
  const staff = await resolveStaffAuth()
  if (!staff) return { error: 'Not authenticated' }

  const storeId = staff.store_id

  // 2. Validate input with Zod
  const parsed = UpdateStatusSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Invalid input' }
  }

  const { orderId, newStatus } = parsed.data

  // 3. Fetch current order: verify it belongs to this store
  const supabase = createSupabaseAdminClient()
  const { data: order, error: fetchError } = await supabase
    .from('orders')
    .select('id, status, store_id, channel')
    .eq('id', orderId)
    .eq('store_id', storeId)
    .single()

  if (fetchError || !order) {
    return { error: 'Order not found' }
  }

  const currentStatus = order.status

  // 4. Validate the transition is allowed
  const allowedNext = ALLOWED_TRANSITIONS[currentStatus]
  if (!allowedNext || !allowedNext.includes(newStatus)) {
    return { error: `Invalid status transition from ${currentStatus} to ${newStatus}` }
  }

  // 5. Update order status
  const { error: updateError } = await supabase
    .from('orders')
    .update({ status: newStatus })
    .eq('id', orderId)

  if (updateError) {
    console.error('[updateOrderStatus] Update error:', updateError.message)
    return { error: 'Failed to update order status. Please try again.' }
  }

  // NOTIF-03: Send pickup-ready email when status changes to "ready"
  if (newStatus === 'ready') {
    const { data: orderForEmail } = await supabase
      .from('orders')
      .select('customer_email, order_items(quantity, products(name))')
      .eq('id', orderId)
      .single()

    if (orderForEmail?.customer_email) {
      const { data: store } = await supabase
        .from('stores')
        .select('name, address, phone, opening_hours')
        .eq('id', storeId)
        .single()

      if (store) {
        const orderItems = (orderForEmail.order_items ?? []).map((item: { quantity: number; products: { name: string } | null }) => ({
          productName: item.products?.name ?? 'Unknown',
          quantity: item.quantity,
        }))

        // Fire-and-forget per D-05 — email failure must not block status update response
        void sendEmail({
          to: orderForEmail.customer_email,
          subject: 'Your order is ready for pickup',
          react: PickupReadyEmail({
            orderItems,
            storeName: store.name,
            storeAddress: store.address ?? '',
            storePhone: store.phone ?? '',
            openingHours: store.opening_hours ?? '',
            orderNumber: orderId.slice(0, 8).toUpperCase(),
          }),
        })
      }
    }
  }

  // 6. Revalidate relevant paths for cache invalidation
  revalidatePath('/pos/pickups')
  revalidatePath('/admin/orders')

  return { success: true, newStatus }
}
