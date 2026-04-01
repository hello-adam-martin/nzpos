import { z } from 'zod'

export const XeroAccountCodesSchema = z.object({
  cashAccountCode: z.string().min(1, 'Cash account code is required').max(20),
  eftposAccountCode: z.string().min(1, 'EFTPOS account code is required').max(20),
  onlineAccountCode: z.string().min(1, 'Online account code is required').max(20),
})

export type XeroAccountCodesInput = z.infer<typeof XeroAccountCodesSchema>
