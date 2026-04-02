'use server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

const ProfileSchema = z.object({
  name: z.string().max(100).optional(),
  email_receipts: z.enum(['on', 'off']).optional(),
  marketing_emails: z.enum(['on', 'off']).optional(),
})

export async function updateProfile(formData: FormData) {
  const parsed = ProfileSchema.safeParse({
    name: formData.get('name') || undefined,
    email_receipts: formData.get('email_receipts') ? 'on' : 'off',
    marketing_emails: formData.get('marketing_emails') ? 'on' : 'off',
  })
  if (!parsed.success) return { error: parsed.error.issues[0].message }

  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const preferences = {
    email_receipts: parsed.data.email_receipts === 'on',
    marketing_emails: parsed.data.marketing_emails === 'on',
  }

  const { error } = await supabase.from('customers').update({
    name: parsed.data.name ?? null,
    preferences,
    updated_at: new Date().toISOString(),
  }).eq('auth_user_id', user.id)

  if (error) return { error: "Your changes couldn't be saved. Check your connection and try again, or contact support if this keeps happening." }
  return { success: true }
}
