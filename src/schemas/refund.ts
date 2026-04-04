import { z } from 'zod'

export const RefundSchema = z.object({
  orderId: z.string().uuid(),
  reason: z.enum(['customer_request', 'damaged', 'wrong_item', 'other']),
  restoreStock: z.boolean(),
})

type RefundInput = z.infer<typeof RefundSchema>

export const PartialRefundSchema = z.object({
  orderId: z.string().uuid(),
  reason: z.enum(['customer_request', 'damaged', 'wrong_item', 'other']),
  items: z.array(z.object({
    orderItemId: z.string().uuid(),
    quantityToRefund: z.number().int().min(1),
  })).min(1),
})

type PartialRefundInput = z.infer<typeof PartialRefundSchema>
