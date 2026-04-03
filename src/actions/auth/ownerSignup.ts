'use server'
import 'server-only'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'
import { headers } from 'next/headers'
import { SlugSchema } from '@/lib/slugValidation'
import { checkRateLimit } from '@/lib/signupRateLimit'

const OwnerSignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
  storeName: z.string().min(1).max(100),
  slug: SlugSchema,
})

export async function ownerSignup(
  formData: FormData
): Promise<{ error?: Record<string, string[]>; success?: boolean; slug?: string }> {
  // 1. Rate limit check by IP
  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1'
  const rateCheck = checkRateLimit(ip)
  if (!rateCheck.allowed) {
    return { error: { _form: ['Too many signup attempts. Please wait an hour and try again.'] } }
  }

  // 2. Validate input
  const parsed = OwnerSignupSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    storeName: formData.get('storeName'),
    slug: formData.get('slug'),
  })
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const { email, password, storeName, slug } = parsed.data

  // 3. Create auth user — signUp returns "User already registered" if duplicate
  // Use request origin for emailRedirectTo so the PKCE code verifier cookie
  // (stored on the signup domain) is available when the callback fires.
  const origin = headersList.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const supabase = await createSupabaseServerClient()
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/api/auth/callback`,
    },
  })

  if (authError) {
    const msg = authError.message
    if (msg.toLowerCase().includes('already registered') || msg.toLowerCase().includes('already exists')) {
      return { error: { email: ['An account already exists for this email.'] } }
    }
    return { error: { email: [msg] } }
  }

  if (!authData.user) {
    return { error: { _form: ['Signup failed. Please try again.'] } }
  }

  // 4. Call provision_store RPC via admin client (service_role only)
  const admin = createSupabaseAdminClient()
  const { data: rpcData, error: rpcError } = await admin.rpc('provision_store', {
    p_auth_user_id: authData.user.id,
    p_store_name: storeName,
    p_slug: slug,
    p_owner_email: email,
  })

  if (rpcError || !rpcData) {
    // Clean up orphaned auth user to avoid partial state
    await admin.auth.admin.deleteUser(authData.user.id)

    const errMsg = rpcError?.message ?? ''
    if (errMsg.includes('SLUG_TAKEN')) {
      return { error: { slug: [`${slug} is taken — try another`] } }
    }
    return { error: { _form: ['Something went wrong. Please try again.'] } }
  }

  // 5. Set app_metadata with role and store_id directly via admin API.
  // The custom_access_token_hook should do this via JWT claims, but setting it
  // explicitly ensures the metadata is persisted to the user record so the
  // Supabase SDK always returns it (not just in the JWT).
  const storeId = typeof rpcData === 'object' && rpcData !== null ? (rpcData as Record<string, string>).store_id : undefined
  await admin.auth.admin.updateUserById(authData.user.id, {
    app_metadata: { role: 'owner', store_id: storeId },
  })

  // Refresh session to pick up the updated app_metadata
  await supabase.auth.refreshSession()

  return { success: true, slug }
}
