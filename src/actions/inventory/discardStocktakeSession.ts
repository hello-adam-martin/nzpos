'use server'
import 'server-only'
import { requireFeature } from '@/lib/requireFeature'
import { resolveAuth } from '@/lib/resolveAuth'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const DiscardSchema = z.object({ session_id: z.string().uuid() })

/**
 * Server action to discard an in-progress stocktake session.
 *
 * Feature-gated: requires inventory add-on (requireDbCheck: true for mutations).
 * Only sessions with status='in_progress' belonging to the store can be discarded.
 * Sets status to 'discarded' and records discarded_at timestamp.
 *
 * @param input - Raw input with session_id; validated with DiscardSchema
 * @returns { success: true } on success
 *          { error: 'feature_not_active' } if inventory add-on not enabled
 *          { error: 'validation_failed' } if input invalid
 *          { error: 'not_authenticated' } if no auth session
 *          { error: 'server_error' } on unexpected DB error
 */
export async function discardStocktakeSession(input: unknown) {
  const gate = await requireFeature('inventory', { requireDbCheck: true })
  if (!gate.authorized) return { error: 'feature_not_active' as const }

  const parsed = DiscardSchema.safeParse(input)
  if (!parsed.success) return { error: 'validation_failed' as const }

  const staff = await resolveAuth()
  if (!staff) return { error: 'not_authenticated' as const }

  const adminClient = createSupabaseAdminClient()

  const now = new Date().toISOString()
  const { error } = await adminClient
    .from('stocktake_sessions')
    .update({ status: 'discarded', discarded_at: now, updated_at: now })
    .eq('id', parsed.data.session_id)
    .eq('store_id', staff.store_id)
    .eq('status', 'in_progress')

  if (error) return { error: 'server_error' as const }
  return { success: true as const }
}
