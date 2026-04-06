'use server'
import 'server-only'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveStaffAuth } from '@/lib/resolveAuth'

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const VoidGiftCardSchema = z.object({
  giftCardId: z.string().uuid(),
  reason: z.string().min(4, 'Reason must be at least 4 characters'),
})

export type VoidGiftCardResult =
  | { success: true }
  | { success: false; error: string }

// ---------------------------------------------------------------------------
// Server Action
// ---------------------------------------------------------------------------

/**
 * Voids an active gift card. Owner-only action (D-14).
 *
 * - Verifies role === 'owner' from staff JWT (DB-verified via resolveStaffAuth)
 * - Requires reason with minimum 4 characters
 * - Calls void_gift_card SECURITY DEFINER RPC
 * - Revalidates /admin/gift-cards on success
 */
export async function voidGiftCard(input: unknown): Promise<VoidGiftCardResult> {
  const staff = await resolveStaffAuth()
  if (!staff) return { success: false, error: 'Not authenticated — please log in again' }

  // D-14: Owner-only action
  if (staff.role !== 'owner') {
    return { success: false, error: 'Only store owners can void gift cards' }
  }

  const parsed = VoidGiftCardSchema.safeParse(input)
  if (!parsed.success) {
    const firstError = parsed.error.flatten().fieldErrors
    if (firstError.reason?.[0]) {
      return { success: false, error: firstError.reason[0] }
    }
    return { success: false, error: 'Invalid input' }
  }

  const { giftCardId, reason } = parsed.data
  const storeId = staff.store_id
  const supabase = createSupabaseAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).rpc('void_gift_card', {
    p_store_id: storeId,
    p_gift_card_id: giftCardId,
    p_reason: reason,
  })

  if (error) {
    console.error('[voidGiftCard] store_id=%s giftCardId=%s error:', storeId, giftCardId, error)
    return { success: false, error: 'Failed to void gift card' }
  }

  revalidatePath('/admin/gift-cards')

  return { success: true }
}
