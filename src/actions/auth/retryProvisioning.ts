'use server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'
import { SlugSchema } from '@/lib/slugValidation'

const RetrySchema = z.object({
  storeName: z.string().min(1).max(100),
  slug: SlugSchema,
})

/**
 * Re-run provision_store for an authenticated user whose initial provisioning failed.
 * Accepts storeName and slug from FormData — the user supplied these at signup
 * but the RPC failed before writing to the DB.
 */
export async function retryProvisioning(
  formData: FormData
): Promise<{ success?: boolean; slug?: string; error?: string }> {
  // 1. Require authenticated user
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: 'Not authenticated' }
  }

  // 2. Check if store already exists (idempotent — safe to call twice)
  const admin = createSupabaseAdminClient()
  const { data: existingStore } = await admin
    .from('stores')
    .select('id, slug')
    .eq('owner_auth_id', user.id)
    .maybeSingle()

  if (existingStore) {
    return { success: true, slug: existingStore.slug }
  }

  // 3. Parse + validate inputs
  const parsed = RetrySchema.safeParse({
    storeName: formData.get('storeName'),
    slug: formData.get('slug'),
  })
  if (!parsed.success) {
    return { error: 'Invalid store name or slug.' }
  }

  const { storeName, slug } = parsed.data

  // 4. Re-run provision_store RPC
  const { data: rpcData, error: rpcError } = await admin.rpc('provision_store', {
    p_auth_user_id: user.id,
    p_store_name: storeName,
    p_slug: slug,
    p_owner_email: user.email ?? '',
  })

  if (rpcError || !rpcData) {
    const errMsg = rpcError?.message ?? ''
    if (errMsg.includes('SLUG_TAKEN')) {
      return { error: 'Slug taken' }
    }
    return { error: 'Provisioning failed. Please try again.' }
  }

  // 5. Set app_metadata with role and store_id via admin API
  const storeId = typeof rpcData === 'object' && rpcData !== null ? (rpcData as Record<string, string>).store_id : undefined
  await admin.auth.admin.updateUserById(user.id, {
    app_metadata: { role: 'owner', store_id: storeId },
  })

  // Refresh session to pick up the updated app_metadata
  await supabase.auth.refreshSession()

  return { success: true, slug }
}
