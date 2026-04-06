import { z } from 'zod'

const OrderItemSchema = z.object({
  product_id: z.string().uuid(),
  product_name: z.string().min(1),
  unit_price_cents: z.number().int().min(0),
  quantity: z.number().int().min(1),
  discount_cents: z.number().int().min(0).default(0),
  line_total_cents: z.number().int(),
  gst_cents: z.number().int().min(0),
})

export const CreateOrderSchema = z.object({
  channel: z.enum(['pos', 'online']),
  status: z.enum(['pending', 'completed', 'refunded', 'expired', 'pending_pickup', 'ready', 'collected']),
  items: z.array(OrderItemSchema).min(1),
  subtotal_cents: z.number().int(),
  gst_cents: z.number().int().min(0),
  total_cents: z.number().int(),
  discount_cents: z.number().int().min(0).default(0),
  payment_method: z.enum(['eftpos', 'cash', 'stripe', 'split', 'gift_card']).optional(),
  cash_tendered_cents: z.number().int().min(0).optional(),
  gift_card_code: z.string().optional(),
  gift_card_amount_cents: z.number().int().positive().optional(),
  split_remainder_method: z.enum(['eftpos', 'cash']).optional(),
  staff_id: z.string().uuid().optional(),
  customer_email: z.string().email().optional(),
  customer_id: z.string().uuid().optional(),
  loyalty_discount_cents: z.number().int().min(0).optional(),
  loyalty_points_redeemed: z.number().int().min(0).optional(),
  notes: z.string().max(500).optional(),
  receipt_data: z.record(z.string(), z.unknown()).optional(),
})

export const CreatePromoCodeSchema = z.object({
  code: z.string().min(1).max(50).transform(s => s.toUpperCase()),
  discount_type: z.enum(['percentage', 'fixed']),
  discount_value: z.number().int().min(1),
  min_order_cents: z.number().int().min(0).default(0),
  max_uses: z.number().int().min(1).optional(),
  expires_at: z.string().datetime().optional(),
})

type CreateOrderInput = z.infer<typeof CreateOrderSchema>
type OrderItemInput = z.infer<typeof OrderItemSchema>
type CreatePromoCodeInput = z.infer<typeof CreatePromoCodeSchema>
