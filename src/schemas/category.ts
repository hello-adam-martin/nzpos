import { z } from 'zod'

export const CreateCategorySchema = z.object({
  name: z.string().min(1, 'This field is required.').max(100),
})

export const UpdateCategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'This field is required.').max(100),
})

export const ReorderCategoriesSchema = z.object({
  categories: z.array(z.object({
    id: z.string().uuid(),
    sort_order: z.number().int().min(0),
  })),
})

export const DeleteCategorySchema = z.object({
  id: z.string().uuid(),
})

type CreateCategoryInput = z.infer<typeof CreateCategorySchema>
type UpdateCategoryInput = z.infer<typeof UpdateCategorySchema>
type ReorderCategoriesInput = z.infer<typeof ReorderCategoriesSchema>
