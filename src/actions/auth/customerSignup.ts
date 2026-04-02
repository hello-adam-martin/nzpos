'use server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'
import { redirect } from 'next/navigation'

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
    if (error.message.includes('already registered')) {
      return { error: 'An account with this email already exists.', existingUser: true }
    }
    return { error: 'Could not create account. Please try again.' }
  }

  if (!data.user) return { error: 'Unexpected error during signup.' }

  // Insert customers row using admin client (bypasses RLS)
  // store_id from env -- same pattern as createCheckoutSession.ts
  const admin = createSupabaseAdminClient()
  const storeId = process.env.STORE_ID!
  const { error: insertError } = await admin.from('customers').insert({
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
  await admin.rpc('link_customer_orders', {
    p_auth_user_id: data.user.id,
    p_email: parsed.data.email,
  })

  // Force token refresh so auth hook picks up customers row (Pitfall 1)
  await supabase.auth.refreshSession()

  redirect(`/account/verify-email?email=${encodeURIComponent(parsed.data.email)}`)
}
