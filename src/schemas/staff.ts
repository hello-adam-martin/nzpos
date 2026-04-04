import { z } from 'zod'
import { POS_ROLES } from '@/config/roles'

// Shared PIN validation: exactly 4 digits, padded with leading zeros
const pinSchema = z.string().length(4).regex(/^\d{4}$/, 'PIN must be exactly 4 digits')

/**
 * Schema for creating a new staff member.
 * Owners cannot be created via this flow (D-07: only owner/manager can create staff).
 * Role is limited to manager or staff — owners are created at signup only.
 */
export const CreateStaffSchema = z.object({
  name: z.string().min(1).max(100),
  pin: pinSchema,
  role: z.enum([POS_ROLES.MANAGER, POS_ROLES.STAFF]),
})

/**
 * Schema for updating an existing staff member.
 * staffId is required to identify the record.
 * All other fields are optional — only provided fields are updated.
 * Role can be changed to any tier (owner can reassign to manager or staff).
 */
export const UpdateStaffSchema = z.object({
  staffId: z.string().uuid(),
  name: z.string().min(1).max(100).optional(),
  role: z.enum([POS_ROLES.OWNER, POS_ROLES.MANAGER, POS_ROLES.STAFF]).optional(),
})

/**
 * Schema for resetting a staff member's PIN.
 */
export const ResetStaffPinSchema = z.object({
  staffId: z.string().uuid(),
  pin: pinSchema,
})

/**
 * Schema for deactivating a staff member (soft delete).
 */
export const DeactivateStaffSchema = z.object({
  staffId: z.string().uuid(),
})

/**
 * Schema for staff PIN login — unchanged from original.
 * Used in the PIN login Server Action.
 */
export const StaffPinLoginSchema = z.object({
  storeId: z.string().uuid(),
  staffId: z.string().uuid(),
  pin: z.string().length(4).regex(/^\d{4}$/),
})

// Inferred TypeScript types
export type CreateStaffInput = z.infer<typeof CreateStaffSchema>
export type UpdateStaffInput = z.infer<typeof UpdateStaffSchema>
export type ResetStaffPinInput = z.infer<typeof ResetStaffPinSchema>
export type DeactivateStaffInput = z.infer<typeof DeactivateStaffSchema>
export type StaffPinLoginInput = z.infer<typeof StaffPinLoginSchema>
