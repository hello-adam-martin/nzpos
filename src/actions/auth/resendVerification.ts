'use server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

const ResendSchema = z.object({
  email: z.string().email(),
})

export async function resendVerification(formData: FormData) {
  const parsed = ResendSchema.safeParse({ email: formData.get('email') })
  if (!parsed.success) return { error: 'Invalid email.' }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: parsed.data.email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/account/callback`,
    },
  })

  if (error) return { error: 'Could not resend verification email. Please try again.' }
  return { success: true }
}
