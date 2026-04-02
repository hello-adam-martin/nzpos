import 'server-only'
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { resolveStaffAuth } from '@/lib/resolveAuth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  // Auth: staff session required
  const staff = await resolveStaffAuth()
  if (!staff) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const since = req.nextUrl.searchParams.get('since') ?? new Date(0).toISOString()
  const supabase = createSupabaseAdminClient()

  const { data: orders, error } = await supabase
    .from('orders')
    .select('id, total_cents, created_at')
    .eq('store_id', staff.store_id)
    .eq('channel', 'online')
    .in('status', ['pending_pickup', 'ready'])
    .gt('created_at', since)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[new-orders] Query error:', error.message)
    return NextResponse.json({ orders: [], serverTime: new Date().toISOString() })
  }

  return NextResponse.json({
    orders: (orders ?? []).map(o => ({
      id: o.id,
      totalCents: o.total_cents,
      createdAt: o.created_at,
    })),
    serverTime: new Date().toISOString(),
  })
}
