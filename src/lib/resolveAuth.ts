import 'server-only'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const secret = new TextEncoder().encode(process.env.STAFF_JWT_SECRET!)

export async function resolveAuth(): Promise<{ store_id: string; staff_id: string } | null> {
  // Try owner Supabase session first
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user?.app_metadata?.store_id) {
    return { store_id: user.app_metadata.store_id, staff_id: user.id }
  }
  // Fall back to staff PIN JWT
  const cookieStore = await cookies()
  const token = cookieStore.get('staff_session')?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, secret)
    const p = payload as { store_id: string; staff_id: string }
    return { store_id: p.store_id, staff_id: p.staff_id }
  } catch {
    return null
  }
}
