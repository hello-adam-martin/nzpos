import { z } from 'zod'

export const CreateProductSchema = z.object({
  name: z.string().min(1).max(200),
  sku: z.string().max(50).optional(),
  barcode: z.string().max(50).optional(),
  price_cents: z.number().int().min(0),
  category_id: z.string().uuid().optional(),
  stock_quantity: z.number().int().min(0).default(0),
  reorder_threshold: z.number().int().min(0).default(0),
  image_url: z.string().url().optional(),
})

export const UpdateProductSchema = CreateProductSchema.partial()

type CreateProductInput = z.infer<typeof CreateProductSchema>
type UpdateProductInput = z.infer<typeof UpdateProductSchema>
