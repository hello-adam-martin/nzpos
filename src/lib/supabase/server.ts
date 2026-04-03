import 'server-only'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

export async function createSupabaseServerClient() {
  const cookieStore = await cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (all) => {
          try {
            const rootDomain = process.env.ROOT_DOMAIN ?? 'lvh.me:3004'
            const domain = '.' + rootDomain.split(':')[0] // .lvh.me or .nzpos.co.nz
            all.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, { ...options, domain })
            )
          } catch {
            // setAll fails in Server Components (read-only context)
          }
        },
      },
    }
  )
}
