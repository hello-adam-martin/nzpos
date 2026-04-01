'use server'
import 'server-only'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { CreateOrderSchema } from '@/schemas/order'

const secret = new TextEncoder().encode(process.env.STAFF_JWT_SECRET!)

async function getStaffSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get('staff_session')?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, secret)
    return payload as { role: string; store_id: string; staff_id: string }
  } catch {
    return null
  }
}

export async function completeSale(input: unknown) {
  // 1. Verify staff JWT from staff_session cookie
  const staff = await getStaffSession()
  if (!staff) return { error: 'Not authenticated — please log in again' }

  // 2. Validate input with Zod
  const parsed = CreateOrderSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Invalid order data', details: parsed.error.flatten().fieldErrors }
  }

  // 3. Call atomic RPC via admin client (bypasses RLS — admin client required for stock decrement)
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase.rpc('complete_pos_sale', {
    p_store_id: staff.store_id,
    p_staff_id: staff.staff_id,
    p_payment_method: parsed.data.payment_method ?? 'eftpos',
    p_subtotal_cents: parsed.data.subtotal_cents,
    p_gst_cents: parsed.data.gst_cents,
    p_total_cents: parsed.data.total_cents,
    p_discount_cents: parsed.data.discount_cents ?? 0,
    p_cash_tendered_cents: parsed.data.cash_tendered_cents ?? null,
    p_notes: parsed.data.notes ?? null,
    p_items: parsed.data.items,
  })

  // 4. Handle RPC errors with structured codes
  if (error) {
    if (error.message.includes('OUT_OF_STOCK')) {
      const parts = error.message.split(':')
      return {
        error: 'out_of_stock',
        productId: parts[1]?.trim(),
        message: parts.slice(2).join(':').trim(),
      }
    }
    if (error.message.includes('PRODUCT_NOT_FOUND')) {
      return {
        error: 'product_not_found',
        productId: error.message.split(':')[1]?.trim(),
      }
    }
    return { error: 'Sale could not be recorded. Please try again or note the order manually.' }
  }

  // 5. Revalidate POS page for inventory refresh-on-transaction
  revalidatePath('/pos')

  return { success: true, orderId: (data as { order_id: string }).order_id }
}
