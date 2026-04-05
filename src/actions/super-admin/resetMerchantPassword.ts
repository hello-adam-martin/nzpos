'use server'
import 'server-only'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

const ResetMerchantPasswordSchema = z.object({
  storeId: z.string().uuid(),
  ownerEmail: z.string().email(),
})

export async function resetMerchantPassword(
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
  const parsed = ResetMerchantPasswordSchema.safeParse({
    storeId: formData.get('storeId'),
    ownerEmail: formData.get('ownerEmail'),
  })
  if (!parsed.success) {
    return { error: 'Invalid input' }
  }

  const { storeId, ownerEmail } = parsed.data
  const admin = createSupabaseAdminClient()

  // 3. Send password reset email via Supabase Auth
  // Note: use admin.auth.resetPasswordForEmail (NOT admin.auth.admin.resetPasswordForEmail)
  const { error: resetError } = await admin.auth.resetPasswordForEmail(ownerEmail, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/admin/login`,
  })

  if (resetError) {
    return { error: 'Failed to send password reset email' }
  }

  // 4. Insert audit log
  await admin.from('super_admin_actions').insert({
    super_admin_user_id: user.id,
    action: 'password_reset',
    store_id: storeId,
    note: `Password reset email sent to ${ownerEmail}`,
  })

  // 5. Revalidate path
  revalidatePath(`/super-admin/tenants/${storeId}`)

  return { success: true }
}
