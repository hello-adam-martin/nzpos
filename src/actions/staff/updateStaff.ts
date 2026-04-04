'use server'
import 'server-only'
import { revalidatePath } from 'next/cache'
import { UpdateStaffSchema } from '@/schemas/staff'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { POS_ROLES } from '@/config/roles'

/**
 * Updates a staff member's name and/or role.
 * On role change, sets pin_locked_until to now() to invalidate any active session (per D-12).
 * Owner-only.
 */
export async function updateStaff(
  input: unknown
): Promise<{ success: true } | { error: string }> {
  // 1. Auth: owner only
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  if (user.app_metadata?.role !== POS_ROLES.OWNER) return { error: 'INSUFFICIENT_ROLE' }

  const storeId = user.app_metadata?.store_id as string | undefined
  if (!storeId) return { error: 'No store context' }

  // 2. Validate input
  const parsed = UpdateStaffSchema.safeParse(input)
  if (!parsed.success) return { error: 'Invalid input' }
  const { staffId, name, role } = parsed.data

  // 3. Build update object
  const updateData: Record<string, unknown> = {}
  if (name !== undefined) updateData.name = name
  if (role !== undefined) {
    updateData.role = role
    // D-12: invalidate active session on role change
    updateData.pin_locked_until = new Date().toISOString()
  }

  if (Object.keys(updateData).length === 0) return { error: 'No fields to update' }

  // 4. Update with tenant isolation
  const adminClient = createSupabaseAdminClient()
  const { error } = await adminClient
    .from('staff')
    .update(updateData)
    .eq('id', staffId)
    .eq('store_id', storeId)

  if (error) return { error: 'Failed to update staff member' }

  revalidatePath('/admin/staff')
  revalidatePath('/pos/login')
  return { success: true }
}
