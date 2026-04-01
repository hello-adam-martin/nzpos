import { z } from 'zod'

export const RefundSchema = z.object({
  orderId: z.string().uuid(),
  reason: z.enum(['customer_request', 'damaged', 'wrong_item', 'other']),
  restoreStock: z.boolean(),
})

export type RefundInput = z.infer<typeof RefundSchema>
