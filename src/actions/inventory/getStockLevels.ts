'use server'
import 'server-only'
import { resolveAuth } from '@/lib/resolveAuth'
import { createSupabaseServerClient } from '@/lib/supabase/server'

/**
 * Server action to retrieve stock levels for all active physical products.
 *
 * Returns products ordered alphabetically by name.
 * Only returns physical product type (services have no stock to track).
 * Includes category name via FK join for display in the inventory UI.
 *
 * @returns { success: true, products } on success
 *          { error: 'not_authenticated' } if no auth session
 *          { error: 'server_error' } on DB error
 */
export async function getStockLevels() {
  const staff = await resolveAuth()
  if (!staff) return { error: 'not_authenticated' as const }

  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from('products')
    .select('id, name, sku, barcode, stock_quantity, reorder_threshold, category_id, categories(name)')
    .eq('store_id', staff.store_id)
    .eq('product_type', 'physical')
    .eq('is_active', true)
    .order('name', { ascending: true })

  if (error) {
    console.error('[getStockLevels] DB error:', error)
    return { error: 'server_error' as const }
  }

  return { success: true as const, products: data ?? [] }
}
