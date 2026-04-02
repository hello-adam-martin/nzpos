import { createClient } from '@supabase/supabase-js'

/**
 * Admin client for use in Next.js middleware (Edge Runtime).
 * Does NOT import 'server-only' — Edge Runtime is not the browser,
 * but the server-only package blocks it anyway (Pitfall 2).
 * Only use for slug-to-store_id lookups in middleware.
 */
export function createMiddlewareAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
