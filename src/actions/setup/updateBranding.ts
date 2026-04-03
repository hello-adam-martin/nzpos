'use server'
import 'server-only'
import { z } from 'zod'
import { resolveAuth } from '@/lib/resolveAuth'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const UpdateBrandingSchema = z.object({
  storeName: z.string().min(1, 'Store name is required').max(100, 'Store name must be 100 characters or fewer'),
  logoUrl: z.string().url('Invalid URL format').nullable(),
  primaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Primary color must be a 6-digit hex color (e.g. #1E293B)')
    .nullable(),
})

export async function updateBranding(input: {
  storeName: string
  logoUrl: string | null
  primaryColor: string | null
}): Promise<{ success: true } | { error: string }> {
  const auth = await resolveAuth()
  if (!auth) return { error: 'Unauthorized' }

  const parsed = UpdateBrandingSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createSupabaseServerClient()

  const { error: dbError } = await supabase
    .from('stores')
    .update({
      name: parsed.data.storeName,
      logo_url: parsed.data.logoUrl,
      primary_color: parsed.data.primaryColor,
    })
    .eq('id', auth.store_id)

  if (dbError) {
    return { error: dbError.message }
  }

  return { success: true }
}
