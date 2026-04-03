'use server'
import 'server-only'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { invalidateCachedStoreId } from '@/lib/tenantCache'
import { revalidatePath } from 'next/cache'

const SuspendTenantSchema = z.object({
  storeId: z.string().uuid(),
  reason: z.string().min(1).max(500),
})

export async function suspendTenant(
  formData: FormData
): Promise<{ success: true } | { error: string }> {
  // 1. Auth check — must be super admin
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || user.app_metadata?.is_super_admin !== true) {
    return { error: 'Unauthorized' }
  }

  // 2. Zod validate
  const parsed = SuspendTenantSchema.safeParse({
    storeId: formData.get('storeId'),
    reason: formData.get('reason'),
  })
  if (!parsed.success) {
    return { error: 'Invalid input' }
  }

  const { storeId, reason } = parsed.data
  const admin = createSupabaseAdminClient()

  // 3. Get store slug for cache invalidation
  const { data: store, error: storeError } = await admin
    .from('stores')
    .select('slug')
    .eq('id', storeId)
    .single()

  if (storeError || !store) {
    return { error: 'Store not found' }
  }

  // 4. Suspend the store
  const { error: updateError } = await admin
    .from('stores')
    .update({
      is_active: false,
      suspended_at: new Date().toISOString(),
      suspension_reason: reason,
    })
    .eq('id', storeId)

  if (updateError) {
    return { error: 'Failed to suspend tenant' }
  }

  // 5. Invalidate tenant cache so middleware immediately reflects suspension
  invalidateCachedStoreId(store.slug)

  // 6. Insert audit log
  await admin.from('super_admin_actions').insert({
    super_admin_user_id: user.id,
    action: 'suspend',
    store_id: storeId,
    note: reason,
  })

  // 7. Revalidate paths
  revalidatePath('/super-admin/tenants')
  revalidatePath(`/super-admin/tenants/${storeId}`)

  return { success: true }
}
