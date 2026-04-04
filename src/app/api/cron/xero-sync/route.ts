import { NextRequest } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { executeDailySyncWithRetry } from '@/lib/xero/sync'

export const dynamic = 'force-dynamic'
// maxDuration: 300 seconds (5 minutes) — accommodates retry backoff delays
// Note: Vercel Hobby plan limits functions to 60s. On Hobby tier, reduce BACKOFF_MS or disable retry.
export const maxDuration = 300

export async function GET(req: NextRequest) {
  // Verify CRON_SECRET Bearer token
  const authHeader = req.headers.get('Authorization')
  if (authHeader !== 'Bearer ' + process.env.CRON_SECRET) {
    return new Response('Unauthorized', { status: 401 })
  }

  // Query all connected stores from xero_connections
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createSupabaseAdminClient() as any
  const { data: connections, error } = await supabase
    .from('xero_connections')
    .select('store_id')
    .eq('status', 'connected')

  if (error) {
    console.error('[xero-sync cron] Failed to query connected stores:', error)
    return Response.json({ error: 'Failed to query connected stores' }, { status: 500 })
  }

  const storeIds: string[] = (connections ?? []).map((c: { store_id: string }) => c.store_id)

  if (storeIds.length === 0) {
    return Response.json({ synced: 0, failed: 0, results: [], message: 'No connected stores' })
  }

  let synced = 0
  let failed = 0
  const results: Array<{
    storeId: string
    success: boolean
    message: string
    invoiceNumber?: string
    attempts: number
  }> = []

  // Sync each store independently — one failure does not block others
  for (const storeId of storeIds) {
    try {
      // D-09: use retry wrapper with up to 3 attempts + exponential backoff
      const result = await executeDailySyncWithRetry(storeId)
      if (result.success) {
        synced++
      } else {
        failed++
      }
      results.push({
        storeId,
        success: result.success,
        message: result.message,
        invoiceNumber: result.invoiceNumber,
        attempts: result.attempts,
      })
    } catch (err) {
      failed++
      console.error(`[xero-sync cron] Unhandled error for store ${storeId}:`, err)
      results.push({
        storeId,
        success: false,
        message: 'Unhandled error',
        attempts: 0,
      })
    }
  }

  return Response.json({ synced, failed, results })
}
