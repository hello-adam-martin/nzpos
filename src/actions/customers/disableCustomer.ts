'use server'
import 'server-only'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { POS_ROLES } from '@/config/roles'

const DisableCustomerSchema = z.object({
  customerId: z.string().uuid(),
})

/**
 * Disables a customer account (two-step: DB flag + Supabase Auth ban).
 * Step A: Sets is_active=false in the customers table.
 * Step B: Bans the auth user for 876600h (100 years = effectively permanent).
 * On Step B failure, rolls back Step A.
 * Owner-only.
 */
export async function disableCustomer(
  input: unknown
): Promise<{ success: true } | { error: string }> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }
  if (user.app_metadata?.role !== POS_ROLES.OWNER) return { error: 'INSUFFICIENT_ROLE' }

  const storeId = user.app_metadata?.store_id as string | undefined
  if (!storeId) return { error: 'No store context' }

  const parsed = DisableCustomerSchema.safeParse(input)
  if (!parsed.success) return { error: 'Invalid input' }
  const { customerId } = parsed.data

  const admin = createSupabaseAdminClient()

  // Step A: DB flag
  const { data, error: dbError } = await admin
    .from('customers')
    .update({ is_active: false })
    .eq('id', customerId)
    .eq('store_id', storeId)
    .select('auth_user_id')
    .single()

  if (dbError || !data) return { error: 'Customer not found' }

  // Step B: Auth ban
  const { error: banError } = await admin.auth.admin.updateUserById(
    data.auth_user_id,
    { ban_duration: '876600h' }
  )

  if (banError) {
    // Rollback: restore is_active=true
    await admin
      .from('customers')
      .update({ is_active: true })
      .eq('id', customerId)
    return { error: 'Failed to disable account' }
  }

  revalidatePath('/admin/customers')
  revalidatePath('/admin/customers/' + customerId)
  return { success: true }
}
