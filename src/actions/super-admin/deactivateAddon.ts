'use server'
import 'server-only'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { FEATURE_TO_COLUMN, type SubscriptionFeature } from '@/config/addons'
import { revalidatePath } from 'next/cache'

const DeactivateAddonSchema = z.object({
  storeId: z.string().uuid(),
  feature: z.enum(['xero', 'email_notifications', 'custom_domain']),
})

export async function deactivateAddon(
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
  const parsed = DeactivateAddonSchema.safeParse({
    storeId: formData.get('storeId'),
    feature: formData.get('feature'),
  })
  if (!parsed.success) {
    return { error: 'Invalid input' }
  }

  const { storeId, feature } = parsed.data
  const column = FEATURE_TO_COLUMN[feature as SubscriptionFeature]
  const overrideColumn = `${column}_manual_override` as const

  const admin = createSupabaseAdminClient()

  // 3. Guard: only manually comp'd add-ons can be deactivated
  const { data: plan, error: planError } = await admin
    .from('store_plans')
    .select(`${column}, ${overrideColumn}`)
    .eq('store_id', storeId)
    .single()

  if (planError || !plan) {
    return { error: 'Store plan not found' }
  }

  // If not a manual override, it's Stripe-managed — block deactivation
  if ((plan as Record<string, unknown>)[overrideColumn] !== true) {
    return { error: 'Cannot deactivate Stripe-managed add-on' }
  }

  // 4. Deactivate the add-on and clear manual override flag
  const { error: updateError } = await admin
    .from('store_plans')
    .update({
      [column]: false,
      [overrideColumn]: false,
    })
    .eq('store_id', storeId)

  if (updateError) {
    return { error: 'Failed to deactivate add-on' }
  }

  // 5. Insert audit log
  await admin.from('super_admin_actions').insert({
    super_admin_user_id: user.id,
    action: 'deactivate_addon',
    store_id: storeId,
    note: feature,
  })

  // 6. Revalidate paths
  revalidatePath('/super-admin/tenants')
  revalidatePath(`/super-admin/tenants/${storeId}`)

  return { success: true }
}
