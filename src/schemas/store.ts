import { z } from 'zod'

export const CreateStoreSchema = z.object({
  name: z.string().min(1).max(100),
})

export const UpdateStoreSchema = CreateStoreSchema.partial()

export type CreateStoreInput = z.infer<typeof CreateStoreSchema>
