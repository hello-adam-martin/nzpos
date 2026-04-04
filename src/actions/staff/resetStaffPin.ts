'use server'
import 'server-only'
import { revalidatePath } from 'next/cache'
import bcryptjs from 'bcryptjs'
import { DeactivateStaffSchema } from '@/schemas/staff'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { POS_ROLES } from '@/config/roles'
import { generatePin } from '@/lib/pin'

/**
 * Generates a new random PIN for a staff member.
 * Returns the plaintext PIN ONCE to the caller (per D-06) for display in PinDisplayModal.
 * Sets pin_locked_until=now() to force the staff member to be re-authenticated with the new PIN.
 * Owner-only.
 */
export async function resetStaffPin(
  input: unknown
): Promise<{ success: true; pin: string } | { error: string }> {
  // 1. Auth: owner only
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  if (user.app_metadata?.role !== POS_ROLES.OWNER) return { error: 'INSUFFICIENT_ROLE' }

  const storeId = user.app_metadata?.store_id as string | undefined
  if (!storeId) return { error: 'No store context' }

  // 2. Validate input (staffId only)
  const parsed = DeactivateStaffSchema.safeParse(input)
  if (!parsed.success) return { error: 'Invalid input' }
  const { staffId } = parsed.data

  // 3. Generate and hash new PIN
  const pin = generatePin()
  const pin_hash = await bcryptjs.hash(pin, 10)

  // 4. Update staff record with new hash and lock out current session
  const adminClient = createSupabaseAdminClient()
  const { error } = await adminClient
    .from('staff')
    .update({ pin_hash, pin_locked_until: new Date().toISOString() })
    .eq('id', staffId)
    .eq('store_id', storeId)

  if (error) return { error: 'Failed to reset PIN' }

  revalidatePath('/admin/staff')
  // Return plaintext PIN once — caller displays it and it is never stored again
  return { success: true, pin }
}
