import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { CashUpAdminPageClient } from '@/components/admin/cash-up/CashUpAdminPageClient'

export const dynamic = 'force-dynamic'

export default async function CashUpPage() {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const storeId = user?.app_metadata?.store_id as string | undefined
  if (!storeId) {
    redirect('/admin/login')
  }

  const adminClient = createSupabaseAdminClient()

  // Fetch last 10 sessions with staff names via join
  const { data: rawSessions } = await adminClient
    .from('cash_sessions')
    .select(`
      id,
      opened_at,
      closed_at,
      opening_float_cents,
      closing_cash_cents,
      expected_cash_cents,
      variance_cents,
      opened_by,
      closed_by
    `)
    .eq('store_id', storeId)
    .order('opened_at', { ascending: false })
    .limit(10)

  // Collect all staff IDs to look up names
  const sessions = rawSessions ?? []
  const staffIds = [
    ...new Set(
      sessions.flatMap((s) => [s.opened_by, s.closed_by].filter(Boolean) as string[])
    ),
  ]

  let staffNameMap: Record<string, string> = {}
  if (staffIds.length > 0) {
    const { data: staffRows } = await adminClient
      .from('staff')
      .select('id, name')
      .in('id', staffIds)
    staffNameMap = Object.fromEntries((staffRows ?? []).map((s) => [s.id, s.name]))
  }

  const formattedSessions = sessions.map((s) => ({
    id: s.id,
    opened_at: s.opened_at,
    closed_at: s.closed_at,
    opening_float_cents: s.opening_float_cents,
    closing_cash_cents: s.closing_cash_cents,
    expected_cash_cents: s.expected_cash_cents,
    variance_cents: s.variance_cents,
    opened_by_name: staffNameMap[s.opened_by] ?? null,
    closed_by_name: s.closed_by ? (staffNameMap[s.closed_by] ?? null) : null,
  }))

  // Determine currently open session
  const currentSession =
    formattedSessions.find((s) => s.closed_at === null) ?? null

  return (
    <div className="space-y-6">
      <h1 className="font-display font-bold text-2xl text-[var(--color-text)]">Cash-Up</h1>

      <CashUpAdminPageClient
        sessions={formattedSessions}
        currentSession={
          currentSession
            ? {
                id: currentSession.id,
                opened_at: currentSession.opened_at,
                opening_float_cents: currentSession.opening_float_cents,
              }
            : null
        }
      />
    </div>
  )
}
