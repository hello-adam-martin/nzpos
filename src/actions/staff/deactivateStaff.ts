'use server'
import 'server-only'
import { revalidatePath } from 'next/cache'
import { DeactivateStaffSchema } from '@/schemas/staff'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { POS_ROLES } from '@/config/roles'

/**
 * Deactivates a staff member (soft delete).
 * Sets is_active=false and pin_locked_until=now() to immediately invalidate their session (per D-11, D-12).
 * Owner-only. Prevents self-deactivation.
 */
export async function deactivateStaff(
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
  const parsed = DeactivateStaffSchema.safeParse(input)
  if (!parsed.success) return { error: 'Invalid input' }
  const { staffId } = parsed.data

  // 3. Prevent self-deactivation (owner deactivating their own staff record)
  if (staffId === user.id) {
    return { error: 'Cannot deactivate your own account' }
  }

  // 4. Update with optimistic lock — only deactivate if currently active
  const adminClient = createSupabaseAdminClient()
  const { data, error } = await adminClient
    .from('staff')
    .update({ is_active: false, pin_locked_until: new Date().toISOString() })
    .eq('id', staffId)
    .eq('store_id', storeId)
    .eq('is_active', true)
    .select('id')

  if (error) return { error: 'Failed to deactivate staff member' }
  if (!data || (data as unknown[]).length === 0) {
    return { error: 'Staff member not found or already inactive' }
  }

  revalidatePath('/admin/staff')
  return { success: true }
}
