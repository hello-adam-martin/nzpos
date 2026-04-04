'use server'
import 'server-only'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'
import { SlugSchema } from '@/lib/slugValidation'
import { headers } from 'next/headers'
import { checkRateLimit } from '@/lib/signupRateLimit'

const ProvisionSchema = z.object({
  userId: z.string().uuid(),
  email: z.string().email(),
  storeName: z.string().min(1).max(100),
  slug: SlugSchema,
})

/**
 * Server Action: provision a store after client-side signUp().
 *
 * The client calls signUp() which creates the auth user and sends
 * the verification email. This action then:
 * 1. Validates input + rate limits
 * 2. Calls provision_store RPC (creates store, staff, store_plans)
 * 3. Sets app_metadata (role + store_id) — but does NOT auto-confirm email
 *
 * Email confirmation happens when the user clicks the verification link.
 * The callback route handles the cross-domain session creation.
 *
 * @param formData - Form data containing userId, email, storeName, and slug fields
 * @returns { success: true } on success, or { error: Record<string, string[]> } with field-level errors
 */
export async function provisionStore(
  formData: FormData
): Promise<{ error?: Record<string, string[]>; success?: boolean }> {
  // Rate limit check by IP
  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1'
  const rateCheck = checkRateLimit(ip)
  if (!rateCheck.allowed) {
    return { error: { _form: ['Too many signup attempts. Please wait an hour and try again.'] } }
  }

  const parsed = ProvisionSchema.safeParse({
    userId: formData.get('userId'),
    email: formData.get('email'),
    storeName: formData.get('storeName'),
    slug: formData.get('slug'),
  })
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const { userId, email, storeName, slug } = parsed.data
  const admin = createSupabaseAdminClient()

  // Provision store via RPC (service_role only)
  const { data: rpcData, error: rpcError } = await admin.rpc('provision_store', {
    p_auth_user_id: userId,
    p_store_name: storeName,
    p_slug: slug,
    p_owner_email: email,
  })

  if (rpcError || !rpcData) {
    // Clean up orphaned auth user
    await admin.auth.admin.deleteUser(userId)

    const errMsg = rpcError?.message ?? ''
    if (errMsg.includes('SLUG_TAKEN')) {
      return { error: { slug: [`${slug} is taken — try another`] } }
    }
    return { error: { _form: ['Something went wrong. Please try again.'] } }
  }

  // Set app_metadata (role + store_id) on the user's JWT claims.
  // Do NOT auto-confirm email — the user must click the verification link.
  const storeId = typeof rpcData === 'object' && rpcData !== null
    ? (rpcData as Record<string, string>).store_id
    : undefined

  await admin.auth.admin.updateUserById(userId, {
    app_metadata: { role: 'owner', store_id: storeId },
  })

  return { success: true }
}
