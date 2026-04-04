import 'server-only'
import { cookies, headers } from 'next/headers'
import { jwtVerify } from 'jose'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const secret = new TextEncoder().encode(process.env.STAFF_JWT_SECRET!)

/**
 * Resolves the authenticated user from either owner Supabase session or staff PIN JWT.
 * Tries owner session first (Supabase Auth), falls back to staff JWT cookie.
 * Uses middleware-injected x-store-id header for tenant context when available.
 *
 * @returns Object with store_id and staff_id if authenticated, or null if not authenticated
 */
export async function resolveAuth(): Promise<{ store_id: string; staff_id: string } | null> {
  // Try owner Supabase session first
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user?.app_metadata?.store_id) {
    // Use middleware-injected x-store-id if available (tenant context from subdomain),
    // falling back to JWT store_id for backward compatibility
    const headerStore = await headers()
    const middlewareStoreId = headerStore.get('x-store-id')
    return {
      store_id: middlewareStoreId ?? user.app_metadata.store_id,
      staff_id: user.id,
    }
  }
  // Fall back to staff PIN JWT
  return resolveStaffAuth()
}

/**
 * Resolves staff-only authentication from the staff_session JWT cookie.
 * Does not check owner Supabase session — staff PIN sessions only.
 * Uses middleware-injected x-store-id header for tenant context when available.
 *
 * @returns Object with store_id, staff_id, and role if staff JWT is valid, or null if not authenticated
 */
export async function resolveStaffAuth(): Promise<{ store_id: string; staff_id: string; role: string } | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('staff_session')?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, secret)
    const p = payload as { store_id: string; staff_id: string; role: string }
    // Use middleware-injected x-store-id if available, falling back to JWT store_id
    const headerStore = await headers()
    const middlewareStoreId = headerStore.get('x-store-id')
    return {
      store_id: middlewareStoreId ?? p.store_id,
      staff_id: p.staff_id,
      role: p.role,
    }
  } catch {
    return null
  }
}
