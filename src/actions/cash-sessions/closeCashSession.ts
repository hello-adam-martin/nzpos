'use server'
import 'server-only'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { resolveAuth } from '@/lib/resolveAuth'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

const CloseSessionSchema = z.object({
  sessionId: z.string().uuid(),
  closingCashCents: z.number().int().min(0),
  notes: z.string().max(500).optional(),
})

export async function closeCashSession(input: {
  sessionId: string
  closingCashCents: number
  notes?: string
}): Promise<
  { success: true; expectedCashCents: number; varianceCents: number } | { error: string }
> {
  const auth = await resolveAuth()
  if (!auth) return { error: 'Not authenticated' }

  const parsed = CloseSessionSchema.safeParse(input)
  if (!parsed.success) return { error: 'Invalid input' }

  const adminClient = createSupabaseAdminClient()

  // Resolve staff table ID
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

  // Fetch the open session
  const { data: session } = await adminClient
    .from('cash_sessions')
    .select('*')
    .eq('id', parsed.data.sessionId)
    .eq('store_id', auth.store_id)
    .is('closed_at', null)
    .maybeSingle()
  if (!session) return { error: 'Session not found or already closed' }

  // Calculate expected cash: float + cash sales during session window
  const { data: cashOrders } = await adminClient
    .from('orders')
    .select('total_cents')
    .eq('store_id', auth.store_id)
    .eq('payment_method', 'cash')
    .in('status', ['completed'])
    .gte('created_at', session.opened_at)
    .lte('created_at', new Date().toISOString())

  const cashSalesTotal = (cashOrders ?? []).reduce((sum, o) => sum + o.total_cents, 0)
  const expectedCashCents = session.opening_float_cents + cashSalesTotal
  const varianceCents = parsed.data.closingCashCents - expectedCashCents

  // Update session
  const { error } = await adminClient
    .from('cash_sessions')
    .update({
      closed_by: staffId,
      closing_cash_cents: parsed.data.closingCashCents,
      expected_cash_cents: expectedCashCents,
      variance_cents: varianceCents,
      closed_at: new Date().toISOString(),
      notes: parsed.data.notes ?? null,
    })
    .eq('id', parsed.data.sessionId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/pos')
  revalidatePath('/admin/cash-up')

  return { success: true, expectedCashCents, varianceCents }
}
