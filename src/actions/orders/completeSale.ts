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
  if (!staff) return { success: false as const, error: 'Not authenticated — please log in again' }

  // 2. Validate input with Zod
  const parsed = CreateOrderSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false as const, error: 'Invalid order data', details: parsed.error.flatten().fieldErrors }
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
        success: false as const,
        error: 'out_of_stock' as const,
        productId,
        message: 'This item is out of stock.',
      }
    }
    if (rpcPayload.includes('PRODUCT_NOT_FOUND')) {
      const productId = rpcPayload.split(':')[1]?.trim()
      return {
        success: false as const,
        error: 'product_not_found' as const,
        productId,
      }
    }
    console.error('[completeSale] store_id=%s RPC error code=%s:', staff.store_id, rpcCode, error)
    return { success: false as const, error: 'Sale could not be recorded. Please try again or note the order manually.' }
  }

  // 6. Build receipt data now that we have the order ID
  const orderId = (data as { order_id: string }).order_id

  // 6a. Gift card redemption (atomic — after order creation)
  let giftCardRemainingCents: number | undefined
  if (parsed.data.gift_card_code && parsed.data.gift_card_amount_cents) {
    // Look up gift card UUID by store_id + code (redeem_gift_card RPC takes p_gift_card_id UUID)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: giftCard } = await (supabase as any)
      .from('gift_cards')
      .select('id')
      .eq('store_id', staff.store_id)
      .eq('code', parsed.data.gift_card_code)
      .maybeSingle() as { data: { id: string } | null }

    if (!giftCard) {
      console.warn('[completeSale] Gift card not found store_id=%s code=%s orderId=%s', staff.store_id, parsed.data.gift_card_code, orderId)
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: redemptionData, error: redemptionError } = await (supabase as any).rpc('redeem_gift_card', {
        p_store_id: staff.store_id,
        p_gift_card_id: giftCard.id,
        p_amount_cents: parsed.data.gift_card_amount_cents,
        p_channel: 'pos',
        p_order_id: orderId,
        p_staff_id: staff.staff_id,
      })
      if (redemptionError) {
        console.warn('[completeSale] Gift card redemption warning store_id=%s orderId=%s:', staff.store_id, orderId, redemptionError)
        // Order is already created — log warning but don't fail the sale
      } else if (redemptionData) {
        const redemptionResult = redemptionData as unknown as { balance_after_cents: number }
        giftCardRemainingCents = redemptionResult.balance_after_cents
      }
    }
  }

  // 6b. Loyalty points redemption (if customer redeemed points — deduct BEFORE earning)
  if (parsed.data.customer_id && parsed.data.loyalty_points_redeemed && parsed.data.loyalty_points_redeemed > 0) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).rpc('redeem_loyalty_points', {
        p_store_id: staff.store_id,
        p_customer_id: parsed.data.customer_id,
        p_points_to_redeem: parsed.data.loyalty_points_redeemed,
        p_order_id: orderId,
        p_channel: 'pos',
        p_staff_id: staff.staff_id,
      })
    } catch (err) {
      console.warn('[completeSale] Loyalty redemption failed (non-fatal):', err)
      // Warn but do NOT void the sale — matches gift card redemption pattern
    }
  }

  // 6c. Loyalty points earning (if customer identified)
  if (parsed.data.customer_id) {
    // D-09: Points earned on NET amount — exclude gift card + loyalty discount to prevent points-on-points loops
    const netAmountCents = parsed.data.total_cents
      - (parsed.data.gift_card_amount_cents ?? 0)
      - (parsed.data.loyalty_discount_cents ?? 0)

    if (netAmountCents > 0) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).rpc('earn_loyalty_points', {
          p_store_id: staff.store_id,
          p_customer_id: parsed.data.customer_id,
          p_order_id: orderId,
          p_net_amount_cents: netAmountCents,
          p_channel: 'pos',
          p_staff_id: staff.staff_id,
        })
      } catch (err) {
        console.warn('[completeSale] Loyalty earning failed (non-fatal):', err)
        // Non-fatal — sale already completed
      }
    }
  }

  const changeDueCents = parsed.data.cash_tendered_cents
    ? calcChangeDue(parsed.data.total_cents, parsed.data.cash_tendered_cents)
    : undefined

  const isGiftCardPayment = parsed.data.gift_card_code !== undefined

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
    paymentMethod: isGiftCardPayment
      ? (parsed.data.split_remainder_method ? (parsed.data.split_remainder_method === 'eftpos' ? 'eftpos' : 'cash') : 'gift_card')
      : ((parsed.data.payment_method ?? 'eftpos') as 'eftpos' | 'cash' | 'split'),
    cashTenderedCents: parsed.data.cash_tendered_cents,
    changeDueCents: changeDueCents && changeDueCents > 0 ? changeDueCents : undefined,
    customerEmail: parsed.data.customer_email,
    giftCardCodeLast4: parsed.data.gift_card_code?.slice(-4),
    giftCardAmountCents: parsed.data.gift_card_amount_cents,
    giftCardRemainingCents,
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
