'use server'
import 'server-only'
import { z } from 'zod'
import { resolveAuth } from '@/lib/resolveAuth'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const SaveLogoSchema = z.object({
  logoUrl: z.string().url('Invalid URL format').nullable(),
  primaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Primary color must be a 6-digit hex color (e.g. #1E293B)')
    .nullable(),
})

export async function saveLogoStep(input: {
  logoUrl: string | null
  primaryColor: string | null
}): Promise<{ success: true } | { error: string }> {
  const auth = await resolveAuth()
  if (!auth) return { error: 'Unauthorized' }

  const parsed = SaveLogoSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const supabase = await createSupabaseServerClient()

  // Read current setup_completed_steps to OR with bit 1
  const { data: current } = await supabase
    .from('stores')
    .select('setup_completed_steps')
    .eq('id', auth.store_id)
    .single()

  const currentSteps = current?.setup_completed_steps ?? 0
  const newSteps = currentSteps | 2 // set bit 1

  const updatePayload: Record<string, unknown> = {
    setup_completed_steps: newSteps,
  }

  if (parsed.data.logoUrl !== null) {
    updatePayload.logo_url = parsed.data.logoUrl
  }
  if (parsed.data.primaryColor !== null) {
    updatePayload.primary_color = parsed.data.primaryColor
  }

  const { error: dbError } = await supabase
    .from('stores')
    .update(updatePayload)
    .eq('id', auth.store_id)

  if (dbError) {
    return { error: dbError.message }
  }

  return { success: true }
}
