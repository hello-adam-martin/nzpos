import { z } from 'zod'

const CreateStaffSchema = z.object({
  name: z.string().min(1).max(100),
  pin: z.string().length(4).regex(/^\d{4}$/, 'PIN must be exactly 4 digits'),
  role: z.enum(['owner', 'staff']),
})

export const StaffPinLoginSchema = z.object({
  storeId: z.string().uuid(),
  staffId: z.string().uuid(),
  pin: z.string().length(4).regex(/^\d{4}$/),
})

const UpdateStaffSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  pin: z.string().length(4).regex(/^\d{4}$/).optional(),
  is_active: z.boolean().optional(),
})

type CreateStaffInput = z.infer<typeof CreateStaffSchema>
type StaffPinLoginInput = z.infer<typeof StaffPinLoginSchema>
