'use server'
import { z } from 'zod'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { validateSlug } from '@/lib/slugValidation'

// ---------------------------------------------------------------------------
// Zod schema — SEC-08 / F-6.6: Zod wraps the custom validateSlug function
// for consistency with the project convention.
// ---------------------------------------------------------------------------

const SlugSchema = z.string().min(1).max(63).regex(/^[a-z0-9-]+$/)

/**
 * Check whether a slug is available for use as a store URL.
 * Returns available:false with a reason if the slug is invalid, reserved, or taken.
 * No authentication required — called from the signup form for live feedback.
 */
export async function checkSlugAvailability(
  slug: unknown
): Promise<{ available: boolean; reason?: string }> {
  // 1. Zod shape + format validation (consistent with project convention)
  const parsedSlug = SlugSchema.safeParse(slug)
  if (!parsedSlug.success) {
    return { available: false, reason: 'Invalid slug format. Use only lowercase letters, numbers, and hyphens.' }
  }

  // 2. Format + reserved-word validation via the canonical validator
  const validation = validateSlug(parsedSlug.data)
  if (!validation.valid) {
    return { available: false, reason: validation.reason }
  }

  // 3. DB uniqueness check
  const admin = createSupabaseAdminClient()
  const { data, error } = await admin
    .from('stores')
    .select('id')
    .eq('slug', parsedSlug.data)
    .maybeSingle()

  if (error) {
    // Don't expose DB errors — treat as unavailable
    return { available: false, reason: 'Unable to check availability. Please try again.' }
  }

  return { available: data === null }
}
