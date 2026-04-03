'use server'
import 'server-only'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { resolveAuth } from '@/lib/resolveAuth'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

const OpenSessionSchema = z.object({
  openingFloatCents: z.number().int().min(0),
})

export async function openCashSession(input: { openingFloatCents: number }): Promise<
  { success: true; sessionId: string } | { error: string }
> {
  const auth = await resolveAuth()
  if (!auth) return { error: 'Not authenticated' }

  const parsed = OpenSessionSchema.safeParse(input)
  if (!parsed.success) return { error: 'Invalid input' }

  const adminClient = createSupabaseAdminClient()

  // Resolve staff table ID
  // For owner: auth.staff_id is user.id (UUID from Supabase Auth), need staff table lookup
  // For staff PIN auth: auth.staff_id is already the staff table ID
  let staffId = auth.staff_id
  const { data: staffRecord } = await adminClient
    .from('staff')
    .select('id')
    .eq('store_id', auth.store_id)
    .eq('auth_user_id', auth.staff_id)
    .maybeSingle()
  if (staffRecord) {
    staffId = staffRecord.id
  }

  // Check no open session exists for this store
  const { data: openSession } = await adminClient
    .from('cash_sessions')
    .select('id')
    .eq('store_id', auth.store_id)
    .is('closed_at', null)
    .maybeSingle()
  if (openSession) return { error: 'A session is already open. Close it first.' }

  // Insert new session
  const { data: session, error } = await adminClient
    .from('cash_sessions')
    .insert({
      store_id: auth.store_id,
      opened_by: staffId,
      opening_float_cents: parsed.data.openingFloatCents,
    })
    .select()
    .single()

  if (error || !session) {
    console.error('[openCashSession] DB error:', error)
    return { error: 'Failed to open cash session' }
  }

  revalidatePath('/pos')
  revalidatePath('/admin/cash-up')

  return { success: true, sessionId: session.id }
}
