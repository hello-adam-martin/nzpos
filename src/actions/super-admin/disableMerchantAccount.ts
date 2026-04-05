'use server'
import 'server-only'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { invalidateCachedStoreId } from '@/lib/tenantCache'
import { revalidatePath } from 'next/cache'

const DisableMerchantAccountSchema = z.object({
  storeId: z.string().uuid(),
  ownerAuthId: z.string().uuid(),
})

export async function disableMerchantAccount(
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
  const parsed = DisableMerchantAccountSchema.safeParse({
    storeId: formData.get('storeId'),
    ownerAuthId: formData.get('ownerAuthId'),
  })
  if (!parsed.success) {
    return { error: 'Invalid input' }
  }

  const { storeId, ownerAuthId } = parsed.data
  const admin = createSupabaseAdminClient()

  // 3. Fetch store slug for cache invalidation
  const { data: store, error: storeError } = await admin
    .from('stores')
    .select('slug')
    .eq('id', storeId)
    .single()

  if (storeError || !store) {
    return { error: 'Store not found' }
  }

  // 4. Ban user in Supabase Auth (876600h ≈ 100 years — effectively permanent)
  const { error: banError } = await admin.auth.admin.updateUserById(ownerAuthId, {
    ban_duration: '876600h',
  })

  if (banError) {
    return { error: 'Failed to ban user' }
  }

  // 5. Suspend store
  const { error: updateError } = await admin
    .from('stores')
    .update({
      is_active: false,
      suspended_at: new Date().toISOString(),
      suspension_reason: 'Account disabled by super-admin',
    })
    .eq('id', storeId)

  if (updateError) {
    return { error: 'Failed to suspend store' }
  }

  // 6. Invalidate tenant cache so middleware immediately reflects suspension
  invalidateCachedStoreId(store.slug)

  // 7. Insert audit log
  await admin.from('super_admin_actions').insert({
    super_admin_user_id: user.id,
    action: 'disable_account',
    store_id: storeId,
    note: 'Account disabled and owner banned',
  })

  // 8. Revalidate paths
  revalidatePath('/super-admin/tenants')
  revalidatePath(`/super-admin/tenants/${storeId}`)

  return { success: true }
}
