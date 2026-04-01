import { NextRequest } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  // Verify CRON_SECRET Bearer token
  const authHeader = req.headers.get('Authorization')
  if (authHeader !== 'Bearer ' + process.env.CRON_SECRET) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createSupabaseAdminClient()

  // Expire pending orders older than 24 hours
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data, error } = await supabase
    .from('orders')
    .update({ status: 'expired' })
    .eq('status', 'pending')
    .lt('created_at', cutoff)
    .select('id')

  if (error) {
    console.error('[expire-orders] Failed:', error.message)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  const count = data?.length ?? 0
  console.log(`[expire-orders] Expired ${count} pending orders`)
  return new Response(JSON.stringify({ expired: count }), { status: 200 })
}
