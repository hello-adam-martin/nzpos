'use server'
import 'server-only'
import { resolveAuth } from '@/lib/resolveAuth'
import { createSupabaseServerClient } from '@/lib/supabase/server'

/**
 * Server action to list all stocktake sessions for the current store.
 *
 * Returns sessions ordered by created_at descending, with line counts
 * for display in the stocktake history list.
 *
 * No feature gate on reads — the sessions can only exist if the feature was
 * active when they were created.
 *
 * @returns { success: true, sessions } on success
 *          { error: 'not_authenticated' } if no auth session
 *          { error: 'server_error' } on unexpected DB error
 */
export async function getStocktakeSessions() {
  const staff = await resolveAuth()
  if (!staff) return { error: 'not_authenticated' as const }

  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from('stocktake_sessions')
    .select('*, stocktake_lines(count)')
    .eq('store_id', staff.store_id)
    .order('created_at', { ascending: false })

  if (error) return { error: 'server_error' as const }
  return { success: true as const, sessions: data ?? [] }
}
