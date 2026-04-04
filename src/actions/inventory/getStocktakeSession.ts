'use server'
import 'server-only'
import { resolveAuth } from '@/lib/resolveAuth'
import { createSupabaseServerClient } from '@/lib/supabase/server'

/**
 * Server action to load a single stocktake session with its lines and product details.
 *
 * Returns the session row and all associated stocktake_lines joined with
 * product name, SKU, and barcode for display in the stocktake count UI.
 *
 * No feature gate on reads — the session can only exist if the feature was
 * active when it was created, and read access is safe regardless.
 *
 * @param sessionId - UUID of the stocktake session to load
 * @returns { success: true, session, lines } on success
 *          { error: 'not_authenticated' } if no auth session
 *          { error: 'session_not_found' } if session does not exist or belongs to another store
 *          { error: 'server_error' } on unexpected DB error
 */
export async function getStocktakeSession(sessionId: string) {
  const staff = await resolveAuth()
  if (!staff) return { error: 'not_authenticated' as const }

  const supabase = await createSupabaseServerClient()

  const { data: session, error: sessionError } = await supabase
    .from('stocktake_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('store_id', staff.store_id)
    .single()

  if (sessionError || !session) return { error: 'session_not_found' as const }

  const { data: lines, error: linesError } = await supabase
    .from('stocktake_lines')
    .select('*, products(name, sku, barcode)')
    .eq('stocktake_session_id', sessionId)
    .eq('store_id', staff.store_id)
    .order('products(name)', { ascending: true })

  if (linesError) return { error: 'server_error' as const }

  return { success: true as const, session, lines: lines ?? [] }
}
