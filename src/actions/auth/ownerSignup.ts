'use server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'
import { redirect } from 'next/navigation'

const OwnerSignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(72),
  storeName: z.string().min(1).max(100),
})

export async function ownerSignup(formData: FormData) {
  const parsed = OwnerSignupSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    storeName: formData.get('storeName'),
  })
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors }

  const supabase = await createSupabaseServerClient()

  // 1. Create auth user (per D-04: no email verification required)
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
  })
  if (authError || !authData.user) return { error: { email: [authError?.message ?? 'Signup failed'] } }

  // 2. Use admin client (service role) for store + staff inserts — bypasses RLS
  // The newly created user has no JWT claims yet (auth hook fires on next token)
  const admin = createSupabaseAdminClient()

  // 3. Create store
  const { data: store, error: storeError } = await admin
    .from('stores')
    .insert({ name: parsed.data.storeName, owner_auth_id: authData.user.id })
    .select('id')
    .single()
  if (storeError || !store) return { error: { storeName: ['Failed to create store'] } }

  // 4. Create staff record for owner (links auth user to store for JWT hook)
  const { error: staffError } = await admin
    .from('staff')
    .insert({
      store_id: store.id,
      auth_user_id: authData.user.id,
      name: parsed.data.email.split('@')[0],
      role: 'owner',
    })
  if (staffError) return { error: { email: ['Failed to create owner record'] } }

  // 5. Refresh session so JWT hook fires and injects store_id + role claims
  // Without this, the first redirect would have a JWT without app_metadata claims
  await supabase.auth.refreshSession()

  redirect('/admin/dashboard')
}
