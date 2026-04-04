'use server'
import 'server-only'
import { revalidatePath } from 'next/cache'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveStaffAuth } from '@/lib/resolveAuth'
import { CreateOrderSchema } from '@/schemas/order'
import { buildReceiptData } from '@/lib/receipt'
import { calcChangeDue } from '@/lib/cart'

export async function completeSale(input: unknown) {
  // 1. Verify staff JWT from staff_session cookie
  const staff = await resolveStaffAuth()
  if (!staff) return { error: 'Not authenticated — please log in again' }

  // 2. Validate input with Zod
  const parsed = CreateOrderSchema.safeParse(input)
  if (!parsed.success) {
    return { error: 'Invalid order data', details: parsed.error.flatten().fieldErrors }
  }

  // 3. Query staff name and store details (for receipt)
  const supabase = createSupabaseAdminClient()

  const { data: staffRecord } = await supabase
    .from('staff')
    .select('name')
    .eq('id', staff.staff_id)
    .single()
  const staffName = staffRecord?.name ?? 'Staff'

  const { data: store } = await supabase
    .from('stores')
    .select('name, address, phone, gst_number')
    .eq('id', staff.store_id)
    .single()

  // 4. Call atomic RPC via admin client (bypasses RLS — admin client required for stock decrement)
  const { data, error } = await supabase.rpc('complete_pos_sale', {
    p_store_id: staff.store_id,
    p_staff_id: staff.staff_id,
    p_payment_method: parsed.data.payment_method ?? 'eftpos',
    p_subtotal_cents: parsed.data.subtotal_cents,
    p_gst_cents: parsed.data.gst_cents,
    p_total_cents: parsed.data.total_cents,
    p_discount_cents: parsed.data.discount_cents ?? 0,
    p_cash_tendered_cents: parsed.data.cash_tendered_cents ?? undefined,
    p_notes: parsed.data.notes ?? undefined,
    p_items: parsed.data.items,
    p_receipt_data: undefined,
    p_customer_email: parsed.data.customer_email ?? undefined,
  })

  // 5. Handle RPC errors with structured codes
  // RPC uses structured error codes: OUT_OF_STOCK:<product_id>:<msg> and PRODUCT_NOT_FOUND:<product_id>
  if (error) {
    const rpcCode = error.code ?? ''
    // Extract structured RPC error code — RPC raises EXCEPTION with OUT_OF_STOCK:<id> or PRODUCT_NOT_FOUND:<id>
    // Supabase surfaces this in the PostgreSQL error object. Cast to read the payload safely.
    const rpcPayload: string = (error as { message?: string }).message ?? ''
    if (rpcPayload.includes('OUT_OF_STOCK')) {
      const parts = rpcPayload.split(':')
      const productId = parts[1]?.trim()
      return {
        error: 'out_of_stock' as const,
        productId,
        message: 'This item is out of stock.',
      }
    }
    if (rpcPayload.includes('PRODUCT_NOT_FOUND')) {
      const productId = rpcPayload.split(':')[1]?.trim()
      return {
        error: 'product_not_found' as const,
        productId,
      }
    }
    console.error('[completeSale] store_id=%s RPC error code=%s:', staff.store_id, rpcCode, error)
    return { error: 'Sale could not be recorded. Please try again or note the order manually.' }
  }

  // 6. Build receipt data now that we have the order ID
  const orderId = (data as { order_id: string }).order_id

  const changeDueCents = parsed.data.cash_tendered_cents
    ? calcChangeDue(parsed.data.total_cents, parsed.data.cash_tendered_cents)
    : undefined

  const receiptData = buildReceiptData({
    orderId,
    store: store ?? { name: '', address: null, phone: null, gst_number: null },
    staffName,
    items: parsed.data.items.map((i) => ({
      productId: i.product_id,
      productName: i.product_name,
      unitPriceCents: i.unit_price_cents,
      quantity: i.quantity,
      discountCents: i.discount_cents,
      lineTotalCents: i.line_total_cents,
      gstCents: i.gst_cents,
    })),
    totals: {
      subtotalCents: parsed.data.subtotal_cents,
      gstCents: parsed.data.gst_cents,
      totalCents: parsed.data.total_cents,
    },
    paymentMethod: (parsed.data.payment_method ?? 'eftpos') as 'eftpos' | 'cash' | 'split',
    cashTenderedCents: parsed.data.cash_tendered_cents,
    changeDueCents: changeDueCents && changeDueCents > 0 ? changeDueCents : undefined,
    customerEmail: parsed.data.customer_email,
  })

  // 7. Update the order with receipt_data
  await supabase
    .from('orders')
    .update({ receipt_data: receiptData as unknown as import('@/types/database').Json })
    .eq('id', orderId)

  // 8. Revalidate POS page for inventory refresh-on-transaction
  revalidatePath('/pos')

  return { success: true, orderId, receiptData }
}
