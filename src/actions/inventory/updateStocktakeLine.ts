'use server'
import 'server-only'
import { requireFeature } from '@/lib/requireFeature'
import { resolveAuth } from '@/lib/resolveAuth'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { UpdateStocktakeLineSchema } from '@/schemas/inventory'

/**
 * Server action to update the counted quantity on a stocktake line (auto-save).
 *
 * Feature-gated: requires inventory add-on (requireDbCheck: true for mutations).
 * Verifies the line belongs to an in_progress session for this store before updating.
 *
 * @param input - Raw input; validated against UpdateStocktakeLineSchema
 * @returns { success: true } on success
 *          { error: 'feature_not_active' } if inventory add-on not enabled
 *          { error: 'validation_failed', issues } if input invalid
 *          { error: 'not_authenticated' } if no auth session
 *          { error: 'line_not_found' } if line does not exist or belongs to another store
 *          { error: 'session_not_in_progress' } if session is not in_progress
 *          { error: 'server_error' } on unexpected DB error
 */
export async function updateStocktakeLine(input: unknown) {
  const gate = await requireFeature('inventory', { requireDbCheck: true })
  if (!gate.authorized) return { error: 'feature_not_active' as const }

  const parsed = UpdateStocktakeLineSchema.safeParse(input)
  if (!parsed.success) return { error: 'validation_failed' as const, issues: parsed.error.issues }

  const staff = await resolveAuth()
  if (!staff) return { error: 'not_authenticated' as const }

  const adminClient = createSupabaseAdminClient()

  // Verify the line belongs to an in_progress session for this store
  const { data: line, error: lineError } = await adminClient
    .from('stocktake_lines')
    .select('id, stocktake_session_id, stocktake_sessions(status)')
    .eq('id', parsed.data.line_id)
    .eq('store_id', staff.store_id)
    .single()

  if (lineError || !line) return { error: 'line_not_found' as const }
  if ((line as unknown as { stocktake_sessions?: { status: string } }).stocktake_sessions?.status !== 'in_progress') {
    return { error: 'session_not_in_progress' as const }
  }

  const { error: updateError } = await adminClient
    .from('stocktake_lines')
    .update({ counted_quantity: parsed.data.counted_quantity, updated_at: new Date().toISOString() })
    .eq('id', parsed.data.line_id)
    .eq('store_id', staff.store_id)

  if (updateError) return { error: 'server_error' as const }
  return { success: true as const }
}
