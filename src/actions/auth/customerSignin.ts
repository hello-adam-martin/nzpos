'use server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { redirect } from 'next/navigation'

const SigninSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function customerSignin(formData: FormData) {
  const parsed = SigninSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) return { error: 'Incorrect email or password.' }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })
  if (error) return { error: 'Incorrect email or password.' }

  // Read return_to from formData for post-signup redirect
  const returnTo = formData.get('return_to')
  const destination =
    typeof returnTo === 'string' && returnTo.startsWith('/') ? returnTo : '/account/orders'
  redirect(destination)
}
