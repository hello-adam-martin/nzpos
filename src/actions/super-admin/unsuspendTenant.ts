'use server'
import 'server-only'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

const UnsuspendTenantSchema = z.object({
  storeId: z.string().uuid(),
  reason: z.string().max(500).optional(),
})

export async function unsuspendTenant(
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
  const parsed = UnsuspendTenantSchema.safeParse({
    storeId: formData.get('storeId'),
    reason: formData.get('reason') ?? undefined,
  })
  if (!parsed.success) {
    return { error: 'Invalid input' }
  }

  const { storeId, reason } = parsed.data
  const admin = createSupabaseAdminClient()

  // 3. Unsuspend the store
  const { error: updateError } = await admin
    .from('stores')
    .update({
      is_active: true,
      suspended_at: null,
      suspension_reason: null,
    })
    .eq('id', storeId)

  if (updateError) {
    return { error: 'Failed to unsuspend tenant' }
  }

  // 4. Insert audit log
  await admin.from('super_admin_actions').insert({
    super_admin_user_id: user.id,
    action: 'unsuspend',
    store_id: storeId,
    note: reason ?? 'No reason given',
  })

  // 5. Revalidate paths
  revalidatePath('/super-admin/tenants')
  revalidatePath(`/super-admin/tenants/${storeId}`)

  return { success: true }
}
