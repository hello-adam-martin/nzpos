'use server'
import 'server-only'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { POS_ROLES } from '@/config/roles'

export type StaffMember = {
  id: string
  name: string
  role: string
  is_active: boolean
  created_at: string
}

/**
 * Returns the list of staff members for the owner's store.
 * Owner-only: only Supabase Auth owners with app_metadata.role === 'owner' may call this.
 */
export async function getStaffList(): Promise<{ data: StaffMember[] } | { error: string }> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  if (user.app_metadata?.role !== POS_ROLES.OWNER) return { error: 'INSUFFICIENT_ROLE' }

  const storeId = user.app_metadata?.store_id as string | undefined
  if (!storeId) return { error: 'No store context' }

  const adminClient = createSupabaseAdminClient()
  const { data, error } = await adminClient
    .from('staff')
    .select('id, name, role, is_active, created_at')
    .eq('store_id', storeId)
    .order('name')

  if (error) return { error: 'Failed to fetch staff list' }

  return { data: (data ?? []) as StaffMember[] }
}
