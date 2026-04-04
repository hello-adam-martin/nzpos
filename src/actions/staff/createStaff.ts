'use server'
import 'server-only'
import { revalidatePath } from 'next/cache'
import bcryptjs from 'bcryptjs'
import { CreateStaffSchema } from '@/schemas/staff'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { POS_ROLES } from '@/config/roles'
import { isPinBlacklisted } from '@/lib/pin'

/**
 * Creates a new staff member with a hashed PIN.
 * Owner-only: returns INSUFFICIENT_ROLE for any non-owner caller (per D-08).
 */
export async function createStaff(
  input: unknown
): Promise<{ success: true; staffId: string } | { error: string | Record<string, string[]> }> {
  // 1. Auth: owner only
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  if (user.app_metadata?.role !== POS_ROLES.OWNER) return { error: 'INSUFFICIENT_ROLE' }

  const storeId = user.app_metadata?.store_id as string | undefined
  if (!storeId) return { error: 'No store context' }

  // 2. Validate input
  const parsed = CreateStaffSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }
  const { name, pin, role } = parsed.data

  // 3. PIN blacklist check
  if (isPinBlacklisted(pin)) {
    return { error: { pin: ["That PIN isn't allowed. Enter a different 4-digit PIN."] } }
  }

  // 4. Hash PIN
  const pin_hash = await bcryptjs.hash(pin, 10)

  // 5. Insert staff record
  const adminClient = createSupabaseAdminClient()
  const { data, error } = await adminClient
    .from('staff')
    .insert({ store_id: storeId, name, pin_hash, role, is_active: true })
    .select('id')
    .single()

  if (error || !data) return { error: 'Failed to create staff member' }

  revalidatePath('/admin/staff')
  revalidatePath('/pos/login')
  return { success: true, staffId: (data as { id: string }).id }
}
