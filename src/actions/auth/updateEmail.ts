'use server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

const EmailSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
})

export async function updateEmail(formData: FormData) {
  const parsed = EmailSchema.safeParse({ email: formData.get('email') })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.updateUser({
    email: parsed.data.email,
  })
  if (error) return { error: 'Could not update email. Please try again.' }
  return { success: true, message: 'A verification email will be sent to your new address.' }
}
