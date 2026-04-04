'use server'
import 'server-only'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'
import { redirect } from 'next/navigation'
import type { SupabaseClient } from '@supabase/supabase-js'

const SignupSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export async function customerSignup(formData: FormData) {
  const parsed = SignupSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createSupabaseServerClient()
  const callbackUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/account/callback`

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { emailRedirectTo: callbackUrl },
  })

  if (error) {
    // Supabase returns status 422 for duplicate email signup attempts
    if (error.status === 422) {
      return { error: 'An account with this email already exists.', existingUser: true }
    }
    console.error('[customerSignup] Signup error:', error)
    return { error: 'Could not create account. Please try again.' }
  }

  if (!data.user) return { error: 'Unexpected error during signup.' }

  // Insert customers row using admin client (bypasses RLS)
  // store_id from env -- same pattern as createCheckoutSession.ts
  // Note: customers table and link_customer_orders RPC are added in migration 012_customer_accounts.sql
  // Types are cast via untyped client until supabase gen types is re-run post-migration
  const admin = createSupabaseAdminClient()
  const untypedAdmin = admin as unknown as SupabaseClient
  const storeId = process.env.STORE_ID!
  const { error: insertError } = await untypedAdmin.from('customers').insert({
    auth_user_id: data.user.id,
    store_id: storeId,
    email: parsed.data.email,
  })

  if (insertError) {
    // Cleanup: delete the auth user if customers insert fails
    await admin.auth.admin.deleteUser(data.user.id)
    return { error: 'Could not create account. Please try again.' }
  }

  // Link past orders where customer_email matches (D-11)
  await untypedAdmin.rpc('link_customer_orders', {
    p_auth_user_id: data.user.id,
    p_email: parsed.data.email,
  })

  // Force token refresh so auth hook picks up customers row (Pitfall 1)
  await supabase.auth.refreshSession()

  redirect(`/account/verify-email?email=${encodeURIComponent(parsed.data.email)}`)
}
