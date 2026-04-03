'use server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { validateSlug } from '@/lib/slugValidation'

/**
 * Check whether a slug is available for use as a store URL.
 * Returns available:false with a reason if the slug is invalid, reserved, or taken.
 * No authentication required — called from the signup form for live feedback.
 */
export async function checkSlugAvailability(
  slug: string
): Promise<{ available: boolean; reason?: string }> {
  // 1. Format + reserved-word validation
  const validation = validateSlug(slug)
  if (!validation.valid) {
    return { available: false, reason: validation.reason }
  }

  // 2. DB uniqueness check
  const admin = createSupabaseAdminClient()
  const { data, error } = await admin
    .from('stores')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()

  if (error) {
    // Don't expose DB errors — treat as unavailable
    return { available: false, reason: 'Unable to check availability. Please try again.' }
  }

  return { available: data === null }
}
