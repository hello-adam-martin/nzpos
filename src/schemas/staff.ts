import { z } from 'zod'

export const CreateStaffSchema = z.object({
  name: z.string().min(1).max(100),
  pin: z.string().length(4).regex(/^\d{4}$/, 'PIN must be exactly 4 digits'),
  role: z.enum(['owner', 'staff']),
})

export const StaffPinLoginSchema = z.object({
  storeId: z.string().uuid(),
  staffId: z.string().uuid(),
  pin: z.string().length(4).regex(/^\d{4}$/),
})

export const UpdateStaffSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  pin: z.string().length(4).regex(/^\d{4}$/).optional(),
  is_active: z.boolean().optional(),
})

export type CreateStaffInput = z.infer<typeof CreateStaffSchema>
export type StaffPinLoginInput = z.infer<typeof StaffPinLoginSchema>
