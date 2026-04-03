'use server'
import 'server-only'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

const PasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

export async function changePassword(formData: FormData) {
  const parsed = PasswordSchema.safeParse({
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  })
  if (error) return { error: 'Could not update password. Please try again.' }
  return { success: true }
}
