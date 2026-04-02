'use server'
import 'server-only'
import { z } from 'zod'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveStaffAuth } from '@/lib/resolveAuth'
import { sendEmail } from '@/lib/email'
import { PosReceiptEmail } from '@/emails/PosReceiptEmail'
import type { ReceiptData } from '@/lib/receipt'

const SendPosReceiptSchema = z.object({
  orderId: z.string().uuid(),
  email: z.string().email(),
})

export async function sendPosReceipt(
  input: unknown
): Promise<{ success: true } | { error: string }> {
  const staff = await resolveStaffAuth()
  if (!staff) return { error: 'Not authenticated' }

  const parsed = SendPosReceiptSchema.safeParse(input)
  if (!parsed.success) return { error: 'Invalid input' }

  const { orderId, email } = parsed.data
  const supabase = createSupabaseAdminClient()

  // Fetch order with receipt_data (stored at POS sale completion)
  const { data: order, error } = await supabase
    .from('orders')
    .select('id, receipt_data, store_id')
    .eq('id', orderId)
    .eq('store_id', staff.store_id)
    .single()

  if (error || !order) return { error: 'Order not found' }
  if (!order.receipt_data) return { error: 'No receipt data available' }

  const receipt = order.receipt_data as ReceiptData

  // Update customer_email on the order (record who received the receipt)
  await supabase
    .from('orders')
    .update({ customer_email: email })
    .eq('id', orderId)

  // Fire-and-forget per D-05, D-06 — email failure must not block the server action response
  void sendEmail({
    to: email,
    subject: `Your receipt from ${receipt.storeName}`,
    react: PosReceiptEmail({ receipt }),
  })

  return { success: true }
}
