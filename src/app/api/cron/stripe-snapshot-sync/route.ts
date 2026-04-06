import 'server-only'
import { NextRequest } from 'next/server'
import { syncStripeSnapshot } from '@/lib/stripe/syncStripeSnapshot'

export const dynamic = 'force-dynamic'
// maxDuration: 60 seconds — Vercel Hobby plan limit
// Note: xero-sync uses 300s but Hobby plan caps all functions at 60s
export const maxDuration = 60

export async function GET(req: NextRequest) {
  // Verify CRON_SECRET Bearer token
  const authHeader = req.headers.get('Authorization')
  if (authHeader !== 'Bearer ' + process.env.CRON_SECRET) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    const result = await syncStripeSnapshot()
    return Response.json(result)
  } catch (err) {
    console.error('[stripe-snapshot-sync cron] Error:', err)
    return Response.json({ error: 'Sync failed' }, { status: 500 })
  }
}
