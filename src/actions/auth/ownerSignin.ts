'use server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { redirect } from 'next/navigation'

const OwnerSigninSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function ownerSignin(formData: FormData) {
  const parsed = OwnerSigninSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) return { error: 'Invalid credentials' }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })
  if (error) return { error: 'Invalid email or password' }

  // Check if this is a super admin logging in on the root domain
  const { data: { user } } = await supabase.auth.getUser()
  if (user?.app_metadata?.is_super_admin === true) {
    // Super admin on root domain should go to super admin panel (per D-02)
    redirect('/super-admin/tenants')
  }

  redirect('/admin/dashboard')
}
