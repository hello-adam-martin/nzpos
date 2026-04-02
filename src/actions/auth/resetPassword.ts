'use server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { redirect } from 'next/navigation'

const ResetSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
})

export async function resetPassword(formData: FormData) {
  const parsed = ResetSchema.safeParse({ email: formData.get('email') })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/account/callback?next=/account/profile`,
  })

  if (error) return { error: 'Could not send reset email. Please try again.' }
  redirect(`/account/verify-email?email=${encodeURIComponent(parsed.data.email)}&type=reset`)
}
