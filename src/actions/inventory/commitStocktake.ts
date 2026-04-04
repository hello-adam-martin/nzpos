'use server'
import 'server-only'
import { requireFeature } from '@/lib/requireFeature'
import { resolveAuth } from '@/lib/resolveAuth'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const CommitStocktakeSchema = z.object({ session_id: z.string().uuid() })

/**
 * Server action to commit a stocktake session via the complete_stocktake RPC.
 *
 * Feature-gated: requires inventory add-on (requireDbCheck: true for mutations).
 * Delegates to the complete_stocktake SECURITY DEFINER RPC which atomically:
 * - Updates stock_quantity for all counted lines
 * - Records stocktake adjustments in stock_adjustments
 * - Sets session status to 'completed'
 *
 * @param input - Raw input with session_id; validated with CommitStocktakeSchema
 * @returns { success: true, lines_committed: N } on success
 *          { error: 'feature_not_active' } if inventory add-on not enabled
 *          { error: 'validation_failed' } if input invalid
 *          { error: 'not_authenticated' } if no auth session
 *          { error: 'invalid_session' } if session is not in_progress (RPC raises INVALID_SESSION)
 *          { error: 'server_error' } on unexpected DB error
 */
export async function commitStocktake(input: unknown) {
  const gate = await requireFeature('inventory', { requireDbCheck: true })
  if (!gate.authorized) return { error: 'feature_not_active' as const }

  const parsed = CommitStocktakeSchema.safeParse(input)
  if (!parsed.success) return { error: 'validation_failed' as const }

  const staff = await resolveAuth()
  if (!staff) return { error: 'not_authenticated' as const }

  const adminClient = createSupabaseAdminClient()

  const { data, error } = await adminClient.rpc('complete_stocktake', {
    p_session_id: parsed.data.session_id,
    p_store_id: staff.store_id,
    p_staff_id: staff.staff_id ?? null,
  })

  if (error) {
    if (error.message?.includes('INVALID_SESSION')) {
      return { error: 'invalid_session' as const }
    }
    console.error('[commitStocktake] RPC error:', error)
    return { error: 'server_error' as const }
  }

  return { success: true as const, lines_committed: (data as { lines_committed: number }).lines_committed }
}
