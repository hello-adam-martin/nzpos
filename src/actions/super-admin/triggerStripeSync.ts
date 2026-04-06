'use server'
import 'server-only'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { syncStripeSnapshot } from '@/lib/stripe/syncStripeSnapshot'
import { revalidatePath } from 'next/cache'

const RATE_LIMIT_MS = 5 * 60 * 1000 // 5 minutes

export async function triggerStripeSync(): Promise<
  { success: true; syncedAt: string } | { error: string; retryAfter?: string }
> {
  // 1. Auth check — super-admin only
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || user.app_metadata?.is_super_admin !== true) {
    return { error: 'Unauthorized' }
  }

  // 2. Rate limit check via metadata table
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createSupabaseAdminClient() as any
  const { data: meta } = await admin
    .from('analytics_sync_metadata')
    .select('last_synced_at')
    .eq('id', 1)
    .single()

  if (meta?.last_synced_at) {
    const lastSync = new Date(meta.last_synced_at).getTime()
    const elapsed = Date.now() - lastSync
    if (elapsed < RATE_LIMIT_MS) {
      const retryAfter = new Date(lastSync + RATE_LIMIT_MS).toISOString()
      return { error: 'Rate limited', retryAfter }
    }
  }

  // 3. Run sync
  const result = await syncStripeSnapshot()
  if (result.error) return { error: result.error }

  revalidatePath('/super-admin/analytics')
  return { success: true, syncedAt: new Date().toISOString() }
}
