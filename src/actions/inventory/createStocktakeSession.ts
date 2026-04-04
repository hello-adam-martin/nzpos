'use server'
import 'server-only'
import { requireFeature } from '@/lib/requireFeature'
import { resolveAuth } from '@/lib/resolveAuth'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { CreateStocktakeSchema } from '@/schemas/inventory'

/**
 * Server action to create a stocktake session and pre-populate lines with snapshot quantities.
 *
 * Feature-gated: requires inventory add-on (requireDbCheck: true for mutations).
 * Creates a stocktake_sessions row then inserts stocktake_lines for all physical
 * products in scope, capturing current stock_quantity as system_snapshot_quantity.
 *
 * @param input - Raw input; validated against CreateStocktakeSchema
 * @returns { success: true, sessionId: uuid } on success
 *          { error: 'feature_not_active' } if inventory add-on not enabled
 *          { error: 'validation_failed', issues } if input invalid
 *          { error: 'not_authenticated' } if no auth session
 *          { error: 'server_error' } on unexpected DB error
 */
export async function createStocktakeSession(input: unknown) {
  const gate = await requireFeature('inventory', { requireDbCheck: true })
  if (!gate.authorized) return { error: 'feature_not_active' as const }

  const parsed = CreateStocktakeSchema.safeParse(input)
  if (!parsed.success) return { error: 'validation_failed' as const, issues: parsed.error.issues }

  const staff = await resolveAuth()
  if (!staff) return { error: 'not_authenticated' as const }

  const adminClient = createSupabaseAdminClient()

  // 1. Create the stocktake session
  const { data: session, error: sessionError } = await adminClient
    .from('stocktake_sessions')
    .insert({
      store_id: staff.store_id,
      scope: parsed.data.scope,
      category_id: parsed.data.scope === 'category' ? parsed.data.category_id : null,
      created_by: staff.staff_id ?? null,
      status: 'in_progress',
    })
    .select('id')
    .single()

  if (sessionError || !session) return { error: 'server_error' as const }

  // 2. Query all physical active products in scope
  let productQuery = adminClient
    .from('products')
    .select('id, stock_quantity')
    .eq('store_id', staff.store_id)
    .eq('product_type', 'physical')
    .eq('is_active', true)

  if (parsed.data.scope === 'category' && parsed.data.category_id) {
    productQuery = productQuery.eq('category_id', parsed.data.category_id)
  }

  const { data: products, error: productsError } = await productQuery
  if (productsError) return { error: 'server_error' as const }

  // 3. Insert stocktake lines with snapshot quantities
  if (products && products.length > 0) {
    const lines = products.map((p) => ({
      stocktake_session_id: session.id,
      store_id: staff.store_id,
      product_id: p.id,
      system_snapshot_quantity: p.stock_quantity ?? 0,
      counted_quantity: null,
    }))

    const { error: linesError } = await adminClient
      .from('stocktake_lines')
      .insert(lines)

    if (linesError) return { error: 'server_error' as const }
  }

  return { success: true as const, sessionId: session.id }
}
