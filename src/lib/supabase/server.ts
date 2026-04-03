import 'server-only'
import { createServerClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'
import type { Database } from '@/types/database'

/**
 * Resolve cookie domain from the current request host.
 * - Subdomain requests (*.lvh.me, *.nzpos.co.nz) → set domain to .lvh.me / .nzpos.co.nz
 *   so cookies are shared across subdomains.
 * - Root domain / localhost / 127.0.0.1 → omit domain so the browser uses the request host.
 *   This is critical for PKCE: the code verifier cookie must be readable on the same
 *   origin where signUp() was called.
 */
function getCookieDomain(host: string): string | undefined {
  const rootDomain = process.env.ROOT_DOMAIN ?? 'lvh.me:3000'
  const rootHost = rootDomain.split(':')[0] // lvh.me or nzpos.co.nz

  // localhost / 127.0.0.1 / bare root domain → no domain attribute
  if (host.startsWith('localhost') || host.startsWith('127.0.0.1') || host === rootDomain) {
    return undefined
  }

  // Subdomain → share across all subdomains
  return '.' + rootHost
}

export async function createSupabaseServerClient() {
  const cookieStore = await cookies()
  const headersList = await headers()
  const host = headersList.get('host') ?? 'localhost:3000'
  const domain = getCookieDomain(host)

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (all) => {
          try {
            all.forEach(({ name, value, options }) => {
              const cookieOpts = { ...options, ...(domain ? { domain } : {}) }
              console.log(`[supabase/server] setAll cookie: ${name}, domain: ${domain ?? '(none)'}, host: ${host}`)
              cookieStore.set(name, value, cookieOpts)
            })
          } catch (e) {
            // setAll fails in Server Components (read-only context)
            console.log(`[supabase/server] setAll failed (expected in RSC): ${e}`)
          }
        },
      },
    }
  )
}
