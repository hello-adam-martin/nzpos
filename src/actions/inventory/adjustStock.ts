'use server'
import 'server-only'
import { requireFeature } from '@/lib/requireFeature'
import { resolveAuth } from '@/lib/resolveAuth'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { AdjustStockSchema } from '@/schemas/inventory'

/**
 * Server action to manually adjust stock for a physical product.
 *
 * Feature-gated: requires inventory add-on (requireDbCheck: true for mutations).
 * Validates input with Zod (only manual reason codes accepted).
 * Delegates to adjust_stock RPC which handles audit log and stock update atomically.
 *
 * @param input - Raw input object; validated against AdjustStockSchema
 * @returns { success: true, new_quantity: N } on success
 *          { error: 'feature_not_active' } if inventory add-on not enabled
 *          { error: 'validation_failed', issues } if input invalid
 *          { error: 'not_authenticated' } if no auth session
 *          { error: 'product_not_found' } if RPC raises PRODUCT_NOT_FOUND
 *          { error: 'server_error' } on unexpected DB error
 */
export async function adjustStock(input: unknown) {
  const gate = await requireFeature('inventory', { requireDbCheck: true })
  if (!gate.authorized) return { error: 'feature_not_active' as const }

  const parsed = AdjustStockSchema.safeParse(input)
  if (!parsed.success) return { error: 'validation_failed' as const, issues: parsed.error.issues }

  const staff = await resolveAuth()
  if (!staff) return { error: 'not_authenticated' as const }

  const adminClient = createSupabaseAdminClient()

  const { data, error } = await adminClient.rpc('adjust_stock', {
    p_store_id: staff.store_id,
    p_product_id: parsed.data.product_id,
    p_quantity_delta: parsed.data.quantity_delta,
    p_reason: parsed.data.reason,
    p_notes: parsed.data.notes ?? null,
    p_staff_id: staff.staff_id ?? null,
  })

  if (error) {
    if (error.message?.includes('PRODUCT_NOT_FOUND')) {
      return { error: 'product_not_found' as const }
    }
    console.error('[adjustStock] RPC error:', error)
    return { error: 'server_error' as const }
  }

  return { success: true as const, new_quantity: (data as { new_quantity: number }).new_quantity }
}
